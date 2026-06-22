// =========================================================
// RENDER: QUEUE
// =========================================================
import { runtime, FALLBACK_COVER } from "./Store.js";
import * as dom from "./Dom.js";

export function renderQueue() {
  dom.queueEmptyStateEl.hidden = runtime.queue.length !== 0;
  dom.queueListEl.innerHTML = runtime.queue
    .map(
      (track, i) => `
    <li class="queue-list__item" draggable="true" data-queue-index="${i}">
      <img class="queue-list__cover" src="${track.cover}" alt="" onerror="this.src='${FALLBACK_COVER}'">
      <span class="queue-list__info">
        <p class="queue-list__name">${track.title}</p>
        <p class="queue-list__artist">${track.artist}</p>
      </span>
      <button class="queue-list__remove" type="button" data-remove="${i}" aria-label="Remove ${track.title} from queue">✕</button>
    </li>
  `,
    )
    .join("");

  dom.queueListEl.querySelectorAll("[data-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      runtime.queue.splice(Number(button.dataset.remove), 1);
      renderQueue();
    });
  });

  let dragFromIndex = null;
  dom.queueListEl.querySelectorAll(".queue-list__item").forEach((item) => {
    item.addEventListener("dragstart", () => {
      dragFromIndex = Number(item.dataset.queueIndex);
      item.classList.add("queue-list__item--dragging");
    });
    item.addEventListener("dragend", () =>
      item.classList.remove("queue-list__item--dragging"),
    );
    item.addEventListener("dragover", (e) => e.preventDefault());
    item.addEventListener("drop", (e) => {
      e.preventDefault();
      const dragToIndex = Number(item.dataset.queueIndex);
      if (dragFromIndex === null || dragFromIndex === dragToIndex) return;
      const [moved] = runtime.queue.splice(dragFromIndex, 1);
      runtime.queue.splice(dragToIndex, 0, moved);
      renderQueue();
    });
  });
}

dom.queueToggleButton.addEventListener("click", () => {
  const willShow = dom.queuePanel.hidden;
  dom.queuePanel.hidden = !willShow;
  dom.queueToggleButton.setAttribute("aria-pressed", String(willShow));
});

dom.clearQueueButton.addEventListener("click", () => {
  runtime.queue = [];
  renderQueue();
});
