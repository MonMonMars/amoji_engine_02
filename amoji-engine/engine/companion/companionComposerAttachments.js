/**
 * Cursor-style composer file attachments — pick, preview, inject into LLM turns.
 */

export const COMPOSER_ATTACH_SCHEMA = "amoji.companionComposerAttachments.v1";
export const COMPOSER_ATTACH_MAX_FILES = 8;
export const COMPOSER_ATTACH_MAX_BYTES = 8 * 1024 * 1024;
export const COMPOSER_ATTACH_TEXT_MAX_CHARS = 12_000;

const TEXT_EXTENSIONS = new Set([
  ".txt",
  ".md",
  ".markdown",
  ".json",
  ".csv",
  ".tsv",
  ".xml",
  ".yaml",
  ".yml",
  ".html",
  ".htm",
  ".css",
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".jsx",
  ".py",
  ".log",
]);

const IMAGE_MIME_PREFIX = "image/";

/**
 * @param {string} name
 */
export function fileExtension(name) {
  const base = String(name || "").trim().toLowerCase();
  const idx = base.lastIndexOf(".");
  return idx >= 0 ? base.slice(idx) : "";
}

/**
 * @param {File} file
 * @returns {"image" | "text" | "binary"}
 */
export function classifyAttachmentFile(file) {
  const mime = String(file?.type || "").toLowerCase();
  const ext = fileExtension(file?.name);
  if (mime.startsWith(IMAGE_MIME_PREFIX)) return "image";
  if (mime.startsWith("text/")) return "text";
  if (TEXT_EXTENSIONS.has(ext)) return "text";
  return "binary";
}

/**
 * @param {string} [accept]
 */
export function composerFileInputAccept(accept) {
  if (accept) return accept;
  const textExts = [...TEXT_EXTENSIONS].join(",");
  return [
    "image/*",
    textExts,
    ".pdf",
    ".doc",
    ".docx",
    ".ppt",
    ".pptx",
    ".zip",
  ].join(",");
}

/**
 * @param {File} file
 * @returns {Promise<{ ok: true, attachment: ComposerAttachment } | { ok: false, error: string }>}
 */
export async function readComposerAttachment(file) {
  if (!file) return { ok: false, error: "empty-file" };
  if (file.size > COMPOSER_ATTACH_MAX_BYTES) {
    return { ok: false, error: "file-too-large" };
  }
  const kind = classifyAttachmentFile(file);
  /** @type {import("./companionComposerAttachments.js").ComposerAttachment} */
  const attachment = {
    id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: String(file.name || "file"),
    mime: String(file.type || "application/octet-stream"),
    size: file.size,
    kind,
  };
  if (kind === "image") {
    attachment.previewUrl = URL.createObjectURL(file);
  } else if (kind === "text") {
    try {
      const raw = await file.text();
      attachment.text =
        raw.length > COMPOSER_ATTACH_TEXT_MAX_CHARS
          ? `${raw.slice(0, COMPOSER_ATTACH_TEXT_MAX_CHARS)}\n…[truncated]`
          : raw;
    } catch {
      return { ok: false, error: "read-failed" };
    }
  }
  return { ok: true, attachment };
}

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   mime: string,
 *   size: number,
 *   kind: "image" | "text" | "binary",
 *   previewUrl?: string,
 *   text?: string,
 * }} ComposerAttachment
 */

/**
 * @param {ComposerAttachment[]} attachments
 * @param {boolean} [englishUi]
 */
export function buildAttachmentPromptBlock(attachments, englishUi = false) {
  if (!attachments?.length) return "";
  const blocks = [];
  for (const att of attachments) {
    if (att.kind === "text" && att.text) {
      blocks.push(
        englishUi
          ? `Attached file "${att.name}":\n\`\`\`\n${att.text}\n\`\`\``
          : `附加檔案「${att.name}」：\n\`\`\`\n${att.text}\n\`\`\``,
      );
      continue;
    }
    if (att.kind === "image") {
      blocks.push(
        englishUi
          ? `[User attached image: ${att.name} (${att.mime}, ${formatBytes(att.size)}). They may refer to it in their message.]`
          : `[用戶附加圖片：${att.name}（${att.mime}，${formatBytes(att.size)}）。可能會喺訊息提到。]`,
      );
      continue;
    }
    blocks.push(
      englishUi
        ? `[User attached file: ${att.name} (${att.mime || "file"}, ${formatBytes(att.size)}). Content was not extracted.]`
        : `[用戶附加檔案：${att.name}（${att.mime || "file"}，${formatBytes(att.size)}）。未能讀取內容。]`,
    );
  }
  return blocks.join("\n\n");
}

/**
 * @param {string} text
 * @param {ComposerAttachment[]} attachments
 * @param {boolean} [englishUi]
 */
export function buildChatTurnText(text, attachments, englishUi = false) {
  const trimmed = String(text || "").trim();
  const block = buildAttachmentPromptBlock(attachments, englishUi);
  if (!block) return trimmed;
  if (!trimmed) {
    return englishUi
      ? `Please review the attached file(s).\n\n${block}`
      : `請睇吓附加檔案。\n\n${block}`;
  }
  return `${trimmed}\n\n${block}`;
}

/**
 * @param {number} bytes
 */
export function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * @param {{
 *   attachBtn: HTMLElement,
 *   fileInput: HTMLInputElement,
 *   stripEl: HTMLElement,
 *   isEnglish?: () => boolean,
 *   onError?: (message: string) => void,
 * }} opts
 */
export function createComposerAttachmentController(opts) {
  /** @type {ComposerAttachment[]} */
  let pending = [];

  const isEnglish = () => opts.isEnglish?.() ?? false;

  const errorMessage = (code) => {
    const en = isEnglish();
    if (code === "file-too-large") {
      return en
        ? `Each file must be under ${formatBytes(COMPOSER_ATTACH_MAX_BYTES)}.`
        : `每個檔案要小於 ${formatBytes(COMPOSER_ATTACH_MAX_BYTES)}。`;
    }
    if (code === "max-files") {
      return en
        ? `At most ${COMPOSER_ATTACH_MAX_FILES} files per message.`
        : `每次最多 ${COMPOSER_ATTACH_MAX_FILES} 個檔案。`;
    }
    return en ? "Could not read that file." : "讀唔到嗰個檔案。";
  };

  const revokeAttachment = (att) => {
    if (att.previewUrl) {
      try {
        URL.revokeObjectURL(att.previewUrl);
      } catch {
        /* ignore */
      }
    }
  };

  const render = () => {
    const strip = opts.stripEl;
    strip.replaceChildren();
    if (!pending.length) {
      strip.hidden = true;
      return;
    }
    strip.hidden = false;
    for (const att of pending) {
      const chip = document.createElement("div");
      chip.className = "composer-attach-chip";
      chip.dataset.attachId = att.id;

      if (att.kind === "image" && att.previewUrl) {
        const img = document.createElement("img");
        img.className = "composer-attach-chip__thumb";
        img.src = att.previewUrl;
        img.alt = att.name;
        chip.appendChild(img);
      } else {
        const icon = document.createElement("span");
        icon.className = "composer-attach-chip__icon";
        icon.textContent = att.kind === "text" ? "📄" : "📎";
        chip.appendChild(icon);
      }

      const meta = document.createElement("span");
      meta.className = "composer-attach-chip__meta";
      const name = document.createElement("span");
      name.className = "composer-attach-chip__name";
      name.textContent = att.name;
      name.title = att.name;
      const size = document.createElement("span");
      size.className = "composer-attach-chip__size";
      size.textContent = formatBytes(att.size);
      meta.appendChild(name);
      meta.appendChild(size);
      chip.appendChild(meta);

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "composer-attach-chip__remove";
      remove.setAttribute("aria-label", isEnglish() ? "Remove file" : "移除檔案");
      remove.textContent = "×";
      remove.addEventListener("click", () => {
        pending = pending.filter((item) => item.id !== att.id);
        revokeAttachment(att);
        render();
      });
      chip.appendChild(remove);
      strip.appendChild(chip);
    }
  };

  const addFiles = async (fileList) => {
    const files = [...(fileList || [])];
    if (!files.length) return;
    for (const file of files) {
      if (pending.length >= COMPOSER_ATTACH_MAX_FILES) {
        opts.onError?.(errorMessage("max-files"));
        break;
      }
      const result = await readComposerAttachment(file);
      if (!result.ok) {
        opts.onError?.(errorMessage(result.error));
        continue;
      }
      pending.push(result.attachment);
    }
    render();
  };

  opts.attachBtn.addEventListener("click", () => {
    opts.fileInput.click();
  });

  opts.fileInput.addEventListener("change", () => {
    void addFiles(opts.fileInput.files).finally(() => {
      opts.fileInput.value = "";
    });
  });

  return {
    schema: COMPOSER_ATTACH_SCHEMA,
    get count() {
      return pending.length;
    },
    getAttachments() {
      return pending.slice();
    },
    clear() {
      for (const att of pending) revokeAttachment(att);
      pending = [];
      render();
    },
    /** Take pending attachments for send (moves out + clears strip). */
    consume() {
      const out = pending.slice();
      pending = [];
      render();
      return out;
    },
    addFiles,
    render,
  };
}

/**
 * Build DOM for a user bubble that includes attachment previews.
 * @param {Document} doc
 * @param {string} text
 * @param {ComposerAttachment[]} attachments
 */
export function buildUserBubbleContent(doc, text, attachments) {
  const frag = doc.createDocumentFragment();
  const trimmed = String(text || "").trim();
  if (trimmed) {
    const p = doc.createElement("p");
    p.className = "bubble-user-text";
    p.textContent = trimmed;
    frag.appendChild(p);
  }
  if (attachments?.length) {
    const row = doc.createElement("div");
    row.className = "bubble-attachments";
    for (const att of attachments) {
      const item = doc.createElement("div");
      item.className = "bubble-attachment";
      if (att.kind === "image" && att.previewUrl) {
        const img = doc.createElement("img");
        img.src = att.previewUrl;
        img.alt = att.name;
        img.className = "bubble-attachment__img";
        item.appendChild(img);
      } else {
        const label = doc.createElement("span");
        label.className = "bubble-attachment__label";
        label.textContent = att.name;
        item.appendChild(label);
      }
      row.appendChild(item);
    }
    frag.appendChild(row);
  }
  return frag;
}
