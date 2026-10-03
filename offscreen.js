const textEl = document.querySelector("#text");

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.target !== "offscreen" || message?.type !== "copy") return;

  const text = String(message.text ?? "");
  textEl.value = text;
  textEl.select();
  if (document.execCommand("copy")) {
    sendResponse({ ok: true });
    return;
  }

  navigator.clipboard.writeText(text).then(
    () => sendResponse({ ok: true }),
    (error) => sendResponse({ ok: false, error: String(error) }),
  );
  return true;
});
