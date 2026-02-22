var jsPsychAnnotationTool = (function (jspsych) {
  'use strict';

  var version = "0.0.1";

  const info = {
    name: "plugin-annotation-tool",
    version,
    parameters: {
      // user can use provided css as is, modify it, or use own css
      stylesheet: {
        type: jspsych.ParameterType.STRING,
        default: "/jspsych/annotation-tool.css"
      },
      dataset: {
        type: jspsych.ParameterType.OBJECT,
        array: true
      },
      labels: {
        type: jspsych.ParameterType.STRING,
        array: true,
        default: void 0
      },
      guidelines: {
        type: jspsych.ParameterType.HTML_STRING,
        default: "This is an example for guidelines."
      },
      keyboard_shortcuts: {
        type: jspsych.ParameterType.OBJECT,
        default: {
          all_items: "a",
          guidelines: "g",
          keyboard_shortcuts: "h",
          rapid_mode: "r",
          prev: "j",
          next: "k",
          save: "s",
          labels: ["1", "2", "3", "4", "5", "6", "7", "8", "9"]
        }
      }
    },
    data: {
      labelled_dataset: {
        type: jspsych.ParameterType.OBJECT,
        array: true
      },
      annotator: {
        type: jspsych.ParameterType.STRING
      }
    },
    // When you run build on your plugin, citations will be generated here based on the information in the CITATION.cff file.
    citations: "__CITATIONS__"
  };
  class AnnotationToolPlugin {
    constructor(jsPsych) {
      this.jsPsych = jsPsych;
    }
    static {
      this.info = info;
    }
    trial(display_element, trial) {
      const fa_link = document.createElement("link");
      fa_link.rel = "stylesheet";
      fa_link.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css";
      document.head.appendChild(fa_link);
      const css_link = document.createElement("link");
      css_link.rel = "stylesheet";
      css_link.href = trial.stylesheet;
      document.head.appendChild(css_link);
      const labelled_dataset = structuredClone(trial.dataset);
      let cur_index = 0;
      const toolbar = document.createElement("div");
      toolbar.id = "jspsych-annotation-tool-toolbar";
      display_element.appendChild(toolbar);
      const toolbar_left = document.createElement("div");
      toolbar_left.classList.add("toolbar-section", "left");
      toolbar.appendChild(toolbar_left);
      const toolbar_right = document.createElement("div");
      toolbar_right.classList.add("toolbar-section", "right");
      toolbar.appendChild(toolbar_right);
      function make_metadata_string(item, index, total) {
        let metadata = `position: ${index + 1} of ${total} | id: ${item.id}`;
        Object.entries(item).forEach(([key, value]) => {
          if (key !== "id" && key !== "text") {
            metadata += ` | ${key}: ${value}`;
          }
        });
        return metadata;
      }
      const all_items = document.createElement("div");
      all_items.id = "jspsych-annotation-tool-all-items";
      all_items.style.display = "none";
      display_element.appendChild(all_items);
      const all_items_buttons = [];
      labelled_dataset.forEach((item, index) => {
        const item_from_all_button = document.createElement("button");
        const item_from_all_text = document.createElement("span");
        item_from_all_text.classList.add("jspsych-annotation-tool-item-from-all-text");
        item_from_all_text.textContent = item.text;
        item_from_all_button.appendChild(item_from_all_text);
        const item_from_all_metadata = document.createElement("span");
        item_from_all_metadata.classList.add("jspsych-annotation-tool-item-from-all-metadata");
        item_from_all_metadata.textContent = make_metadata_string(
          item,
          index,
          labelled_dataset.length
        );
        item_from_all_button.appendChild(item_from_all_metadata);
        item_from_all_button.addEventListener("click", () => {
          cur_index = index;
          update_text();
        });
        all_items_buttons.push(item_from_all_button);
        all_items.appendChild(item_from_all_button);
      });
      function update_all_items_highlight() {
        all_items_buttons.forEach((button, index) => {
          if (index === cur_index) {
            button.classList.add("is-selected");
            button.disabled = true;
          } else {
            button.classList.remove("is-selected");
            button.disabled = false;
          }
        });
      }
      const all_items_button = document.createElement("button");
      const all_items_icon = document.createElement("icon");
      all_items_icon.className = "fa fa-bars fa-fw fa-lg";
      all_items_button.appendChild(all_items_icon);
      all_items_button.addEventListener("click", () => {
        if (all_items.style.display === "none") {
          all_items.style.display = "block";
        } else {
          all_items.style.display = "none";
        }
      });
      toolbar_left.appendChild(all_items_button);
      const popup_container = document.createElement("div");
      popup_container.id = "jspsych-annotation-tool-popup-container";
      popup_container.style.display = "none";
      popup_container.addEventListener("click", () => {
        popup_container.style.display = "none";
      });
      display_element.appendChild(popup_container);
      const popup_box = document.createElement("div");
      popup_box.id = "jspsych-annotation-tool-popup-box";
      popup_box.addEventListener("click", (e) => {
        e.stopPropagation();
      });
      popup_container.appendChild(popup_box);
      const popup_title = document.createElement("div");
      popup_title.id = "jspsych-annotation-tool-popup-title";
      popup_box.appendChild(popup_title);
      const popup_text = document.createElement("div");
      popup_text.id = "jspsych-annotation-tool-popup-text";
      popup_box.appendChild(popup_text);
      function show_popup(title, text) {
        popup_title.textContent = title;
        popup_text.innerHTML = text;
        popup_container.style.display = "flex";
      }
      const guidelines_button = document.createElement("button");
      const guidelines_icon = document.createElement("icon");
      guidelines_icon.className = "fa fa-book fa-fw fa-lg";
      guidelines_button.appendChild(guidelines_icon);
      guidelines_button.addEventListener("click", () => {
        show_popup("Guidelines", trial.guidelines);
      });
      toolbar_left.appendChild(guidelines_button);
      const keyboard_shortcuts = trial.keyboard_shortcuts;
      function generate_shortcuts_table(keyboard_shortcuts2, labels) {
        const key_rows = Object.entries(keyboard_shortcuts2).filter(([action_name]) => action_name !== "labels").map(([action_name, keyboard_key]) => `<tr><td class="key">${keyboard_key}</td><td>${action_name.replace(/_/g, " ")}</td></tr>`).join("");
        const label_rows = keyboard_shortcuts2.labels.map((keyboard_key, label_index) => {
          const label_name = labels[label_index];
          if (!label_name) {
            return null;
          }
          return `<tr><td class="key">${keyboard_key}</td><td>${label_name}</td></tr>`;
        }).filter(Boolean).join("");
        return `
    <table class="shortcut-table">
      ${key_rows}
      <tr><th colspan="2">Labels</th></tr>
      ${label_rows}
    </table>
  `;
      }
      const keyboard_shortcuts_button = document.createElement("button");
      const keyboard_shortcuts_icon = document.createElement("icon");
      keyboard_shortcuts_icon.className = "fa fa-keyboard-o fa-fw fa-lg";
      keyboard_shortcuts_button.appendChild(keyboard_shortcuts_icon);
      keyboard_shortcuts_button.addEventListener("click", () => {
        show_popup("Keyboard shortcuts", generate_shortcuts_table(keyboard_shortcuts, trial.labels));
      });
      toolbar_left.appendChild(keyboard_shortcuts_button);
      const progress_container = document.createElement("div");
      progress_container.id = "jspsych-annotation-tool-progress-container";
      toolbar.appendChild(progress_container);
      const progress_bar = document.createElement("progress");
      progress_bar.max = labelled_dataset.length;
      progress_bar.value = 0;
      progress_container.appendChild(progress_bar);
      const progress_text = document.createElement("span");
      progress_container.appendChild(progress_text);
      const update_progress = () => {
        const labelled_count = labelled_dataset.filter((item) => item.label !== void 0).length;
        progress_bar.value = labelled_count;
        progress_text.textContent = `${labelled_count} of ${labelled_dataset.length} labelled`;
      };
      let rapid_mode = false;
      const rapid_mode_button = document.createElement("button");
      rapid_mode_button.className = "rapid-mode-button";
      const rapid_mode_icon = document.createElement("icon");
      rapid_mode_icon.className = "fa fa-bolt fa-fw fa-lg";
      rapid_mode_button.appendChild(rapid_mode_icon);
      rapid_mode_button.addEventListener("click", () => {
        rapid_mode = !rapid_mode;
        rapid_mode_button.classList.toggle("active", rapid_mode);
      });
      toolbar_right.appendChild(rapid_mode_button);
      const prev_button = document.createElement("button");
      const prev_icon = document.createElement("icon");
      prev_icon.className = "fa fa-chevron-left fa-fw fa-lg";
      prev_button.appendChild(prev_icon);
      prev_button.disabled = cur_index === 0;
      prev_button.addEventListener("click", () => {
        if (cur_index > 0) {
          cur_index--;
          update_text();
        }
      });
      toolbar_right.appendChild(prev_button);
      const next_button = document.createElement("button");
      const next_icon = document.createElement("icon");
      next_icon.className = "fa fa-chevron-right fa-fw fa-lg";
      next_button.appendChild(next_icon);
      next_button.addEventListener("click", () => {
        if (cur_index < labelled_dataset.length - 1) {
          cur_index++;
          update_text();
        }
      });
      toolbar_right.appendChild(next_button);
      async function saveAnnotations(jsonData, annotatorName) {
        const response = await fetch(
          "https://api.github.com/repos/smhancode/smhancode.github.io/actions/workflows/save_annotation.yml/dispatches",
          {
            method: "POST",
            headers: {
              Accept: "application/vnd.github+json"
            },
            body: JSON.stringify({
              ref: "main",
              inputs: {
                json_content: JSON.stringify(jsonData),
                annotator_name: annotatorName
              }
            })
          }
        );
        if (!response.ok) {
          const text = await response.text();
          throw new Error(text);
        }
      }
      const save_button = document.createElement("button");
      const save_icon = document.createElement("icon");
      save_icon.className = "fa fa-save fa-fw fa-lg";
      save_button.appendChild(save_icon);
      save_button.addEventListener("click", async () => {
        this.jsPsych.pluginAPI.cancelAllKeyboardResponses();
        try {
          await saveAnnotations(labelled_dataset, "example person");
          alert("Saved!");
        } catch (err) {
          console.error(err);
          alert("Save failed");
        }
      });
      toolbar_right.appendChild(save_button);
      const labels_container = document.createElement("div");
      labels_container.id = "jspsych-annotation-tool-labels-container";
      display_element.appendChild(labels_container);
      const label_buttons = [];
      function update_label_buttons() {
        const current = labelled_dataset[cur_index].label;
        label_buttons.forEach((btn, i) => {
          btn.classList.toggle("is-selected", i === current);
        });
      }
      trial.labels.forEach((label, label_index) => {
        const label_button = document.createElement("button");
        label_button.className = "jspsych-annotation-tool-label-button";
        label_button.textContent = label;
        label_button.addEventListener("click", () => {
          if (labelled_dataset[cur_index].label === label_index) {
            delete labelled_dataset[cur_index].label;
          } else {
            labelled_dataset[cur_index].label = label_index;
          }
          update_text();
          update_label_buttons();
          update_progress();
        });
        label_buttons.push(label_button);
        labels_container.appendChild(label_button);
      });
      const item_container = document.createElement("div");
      item_container.id = "jspsych-annotation-tool-item-container";
      display_element.appendChild(item_container);
      const item_text = document.createElement("p");
      item_text.id = "jspsych-annotation-tool-item";
      item_container.appendChild(item_text);
      const item_metadata = document.createElement("p");
      item_metadata.id = "jspsych-annotation-tool-metadata";
      item_container.appendChild(item_metadata);
      function update_text() {
        const item = labelled_dataset[cur_index];
        item_text.textContent = item.text;
        item_metadata.textContent = make_metadata_string(item, cur_index, labelled_dataset.length);
        prev_button.disabled = cur_index === 0;
        next_button.disabled = cur_index === labelled_dataset.length - 1;
        update_label_buttons();
        update_progress();
        update_all_items_highlight();
      }
      this.jsPsych.pluginAPI.getKeyboardResponse({
        callback_function: (info2) => {
          if (info2.key === "Escape" && popup_container.style.display !== "none") {
            popup_container.click();
            return;
          }
          if (popup_container.style.display !== "none") {
            return;
          }
          const element = document.activeElement;
          if (element && (element.tagName === "INPUT" || element.tagName === "TEXTAREA" || element.isContentEditable)) {
            return;
          }
          if (info2.key === keyboard_shortcuts.all_items) {
            all_items_button.click();
          }
          if (info2.key === keyboard_shortcuts.guidelines) {
            guidelines_button.click();
          }
          if (info2.key === keyboard_shortcuts.keyboard_shortcuts) {
            keyboard_shortcuts_button.click();
          }
          if (info2.key === keyboard_shortcuts.rapid_mode) {
            rapid_mode_button.click();
          }
          if (info2.key === keyboard_shortcuts.prev) {
            prev_button.click();
          }
          if (info2.key === keyboard_shortcuts.next) {
            next_button.click();
          }
          if (info2.key === keyboard_shortcuts.save) {
            save_button.click();
          }
          const label_index = keyboard_shortcuts.labels.indexOf(info2.key);
          if (label_index !== -1 && label_index < label_buttons.length) {
            label_buttons[label_index].click();
            if (rapid_mode && cur_index < labelled_dataset.length - 1) {
              setTimeout(() => {
                cur_index++;
                update_text();
              }, 50);
            }
          }
        },
        valid_responses: "ALL_KEYS",
        persist: true,
        allow_held_key: false
      });
      update_text();
    }
  }

  return AnnotationToolPlugin;

})(jsPsychModule);
//# sourceMappingURL=index.browser.js.map
