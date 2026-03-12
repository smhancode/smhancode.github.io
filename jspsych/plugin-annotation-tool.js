var jsPsychAnnotationTool = (function (jspsych) {
  'use strict';

  var version = "0.0.1";

  const info = {
    name: "plugin-annotation-tool",
    version,
    parameters: {
      /**
       * stylesheet
       * use default as is, modify it, or use own stylesheet
       * when using original stylesheet, have it in jspsych/
       */
      stylesheet: {
        type: jspsych.ParameterType.STRING,
        default: "jspsych/annotation-tool.css"
      },
      /**
       * dataset to annotate, as JSON array
       * can already have labels
       * e.g.
       * [
       *   { id: 0, text: "text 0" },
       *   { id: 1, text: "text 1", label: 0 },
       *   { id: 2, text: "text 2" },
       * ]
       */
      dataset: {
        type: jspsych.ParameterType.OBJECT,
        array: true,
        default: void 0
      },
      /**
       * labels to annotate data with
       * e.g. ["label0", "label1"]
       */
      labels: {
        type: jspsych.ParameterType.STRING,
        array: true,
        default: void 0
      },
      /**
       * if data can be annotated with multiple labels
       * if true, rapid mode is disabled
       */
      multi_labels: {
        type: jspsych.ParameterType.BOOL,
        default: false
      },
      /**
       * annotation guidelines, can be styled with html
       * e.g.
       * `<ol>
       *    <li>guideline 0</li>
       *    <li>guideline 1</li>
       *    <li>guideline 2</li>
       *  </ol>`
       */
      guidelines: {
        type: jspsych.ParameterType.HTML_STRING,
        default: void 0
      },
      /**
       * keyboard shortcuts
       * can be changed live when using the annotation tool, are stored locally
       */
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
      },
      /**
       * username of github account which owns the repository
       * in which the instance of the annotation tool is hosted
       */
      owner: {
        type: jspsych.ParameterType.STRING,
        default: void 0
      },
      /**
       * name of repository in which the instance of the annotation tool is hosted
       */
      repo: {
        type: jspsych.ParameterType.STRING,
        default: void 0
      },
      /**
       * github actions file, for saving to github
       * default:
       * creates branch with annotator name,
       * commits annotations/YYYY-MM-DD_HH-MM-SS_annotator.json, content is data below,
       * creates pull request (into default branch)
       */
      workflow: {
        type: jspsych.ParameterType.STRING,
        default: "save-annotations.yml"
      }
    },
    data: {
      /**
       * annotator name
       * ideally without whitespace, but is cleaned later on
       */
      annotator: {
        type: jspsych.ParameterType.STRING
      },
      /**
       * annotated dataset, as JSON array again
       */
      annotated_dataset: {
        type: jspsych.ParameterType.OBJECT,
        array: true
      }
    },
    /* when you run build on your plugin,
       citations will be generated here based on the information in the CITATION.cff file. */
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
      const faLink = document.createElement("link");
      faLink.rel = "stylesheet";
      faLink.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css";
      document.head.appendChild(faLink);
      const stylesheetLink = document.createElement("link");
      stylesheetLink.rel = "stylesheet";
      stylesheetLink.href = trial.stylesheet.trim();
      document.head.appendChild(stylesheetLink);
      const owner = (trial.owner ?? "").toLowerCase().trim();
      const repoRaw = (trial.repo ?? "").toLowerCase().trim();
      const repo = repoRaw ? repoRaw.charAt(0).toUpperCase() + repoRaw.slice(1) : "";
      const LOCAL_STORAGE_PREFIX = `${owner}${repo}Annotation`;
      const savedAnnotatedDataset = localStorage.getItem(LOCAL_STORAGE_PREFIX);
      let annotatedDataset;
      if (savedAnnotatedDataset) {
        const parsedSaved = JSON.parse(savedAnnotatedDataset);
        annotatedDataset = parsedSaved.length === trial.dataset.length ? parsedSaved : structuredClone(trial.dataset);
      } else {
        annotatedDataset = structuredClone(trial.dataset);
      }
      let curIdx = Math.min(
        Number(localStorage.getItem(LOCAL_STORAGE_PREFIX + "Index") ?? 0),
        annotatedDataset.length - 1
      );
      function makeMetadataString(item, itemIdx, numItems) {
        let metadata = `position: ${itemIdx + 1} of ${numItems} | id: ${item.id}`;
        Object.entries(item).forEach(([key, value]) => {
          if (key !== "id" && key !== "text") {
            metadata += ` | ${key}: ${value}`;
          }
        });
        return metadata;
      }
      const dialog = document.createElement("dialog");
      dialog.id = "jspsych-annotation-tool-dialog";
      display_element.appendChild(dialog);
      const dialogTitle = document.createElement("div");
      dialogTitle.id = "jspsych-annotation-tool-dialog-title";
      dialog.appendChild(dialogTitle);
      const dialogTitleText = document.createElement("span");
      dialogTitle.appendChild(dialogTitleText);
      const closeButton = document.createElement("button");
      closeButton.className = "jspsych-annotation-tool-dialog-close";
      const closeIcon = document.createElement("i");
      closeIcon.className = "fa fa-times fa-fw";
      closeButton.appendChild(closeIcon);
      closeButton.addEventListener("click", () => {
        dialog.close();
      });
      dialogTitle.appendChild(closeButton);
      const dialogBody = document.createElement("div");
      dialogBody.id = "jspsych-annotation-tool-dialog-body";
      dialog.appendChild(dialogBody);
      function showDialog(title, text) {
        dialogTitleText.textContent = title;
        dialogBody.innerHTML = text;
        if (!dialog.open) {
          dialog.showModal();
          dialog.setAttribute("tabindex", "-1");
          dialog.focus();
          dialog.blur();
          const firstFocusedElem = dialog.querySelector("input, button, textarea");
          firstFocusedElem?.blur();
        }
      }
      const toolbar = document.createElement("div");
      toolbar.id = "jspsych-annotation-tool-toolbar";
      display_element.appendChild(toolbar);
      const toolbarL = document.createElement("div");
      toolbarL.classList.add("toolbar-section", "left");
      toolbar.appendChild(toolbarL);
      const toolbarR = document.createElement("div");
      toolbarR.classList.add("toolbar-section", "right");
      toolbar.appendChild(toolbarR);
      const allItemsContainer = document.createElement("div");
      allItemsContainer.id = "jspsych-annotation-tool-all-items";
      allItemsContainer.style.display = "none";
      display_element.appendChild(allItemsContainer);
      const itemButtons = [];
      annotatedDataset.forEach((item, itemIdx) => {
        const itemButton = document.createElement("button");
        itemButton.addEventListener("click", () => {
          curIdx = itemIdx;
          updateUi();
        });
        itemButtons.push(itemButton);
        allItemsContainer.appendChild(itemButton);
        const itemText2 = document.createElement("span");
        itemText2.classList.add("jspsych-annotation-tool-item-from-all-text");
        itemText2.textContent = item.text;
        itemButton.appendChild(itemText2);
        const itemMetadata2 = document.createElement("span");
        itemMetadata2.classList.add("jspsych-annotation-tool-item-from-all-metadata");
        itemMetadata2.textContent = makeMetadataString(item, itemIdx, annotatedDataset.length);
        itemButton.appendChild(itemMetadata2);
      });
      const allItemsButton = document.createElement("button");
      const allItemsIcon = document.createElement("i");
      allItemsIcon.className = "fa fa-bars fa-fw";
      allItemsButton.appendChild(allItemsIcon);
      allItemsButton.addEventListener("click", () => {
        if (allItemsContainer.style.display === "none") {
          allItemsContainer.style.display = "block";
        } else {
          allItemsContainer.style.display = "none";
        }
      });
      toolbarL.appendChild(allItemsButton);
      const guidelinesButton = document.createElement("button");
      const guidelinesIcon = document.createElement("i");
      guidelinesIcon.className = "fa fa-book fa-fw";
      guidelinesButton.appendChild(guidelinesIcon);
      guidelinesButton.addEventListener("click", () => {
        showDialog("Guidelines", trial.guidelines ?? "No guidelines provided.");
      });
      toolbarL.appendChild(guidelinesButton);
      const savedShortcuts = localStorage.getItem(LOCAL_STORAGE_PREFIX + "KeyboardShortcuts");
      const keyboardShortcuts = savedShortcuts ? JSON.parse(savedShortcuts) : structuredClone(trial.keyboard_shortcuts);
      Object.entries(keyboardShortcuts).forEach(([k, v]) => {
        if (k === "labels") {
          keyboardShortcuts.labels = keyboardShortcuts.labels.map((x) => x.toLowerCase());
          keyboardShortcuts.labels = keyboardShortcuts.labels.slice(0, trial.labels.length);
        } else {
          keyboardShortcuts[k] = v.toLowerCase();
        }
      });
      function makeShortcutsTable(shortcuts, labels) {
        let table = `<table class="shortcut-table">`;
        for (const action in shortcuts) {
          if (action === "labels") {
            continue;
          }
          const actionKey = shortcuts[action];
          table += `
      <tr>
        <td>${action.replace(/_/g, " ")}</td>
        <td>
          <button class="shortcut-capture" data-action="${action}">
            <span>${actionKey}</span>
          </button>
        </td>
      </tr>`;
        }
        table += `<tr><th colspan="2">Labels</th></tr>`;
        labels.forEach((label, labelIdx) => {
          const labelKey = shortcuts.labels[labelIdx];
          if (!labelKey) {
            return;
          }
          table += `
      <tr>
        <td>${label}</td>
        <td>
          <button class="shortcut-capture-label" data-index="${labelIdx}">
            <span>${labelKey}</span>
          </button>
        </td>
      </tr>`;
        });
        table += `</table>
    <p>Click on a shortcut and press a new key. Changes are saved automatically and locally.</p>`;
        return table;
      }
      function keyUsed(key) {
        key = key.toLowerCase();
        const actionKeys = Object.entries(keyboardShortcuts).filter(([k]) => k !== "labels").map(([, v]) => v);
        const labelKeys = keyboardShortcuts.labels;
        return [...actionKeys, ...labelKeys].includes(key);
      }
      function captureNewShortcut() {
        const shortcutKeyButtons = dialog.querySelectorAll(
          ".shortcut-capture, .shortcut-capture-label"
        );
        shortcutKeyButtons.forEach((button) => {
          button.addEventListener("click", () => {
            const span = button.querySelector("span");
            const oldKey = span.textContent ?? "";
            span.textContent = "...";
            const keyboardListener2 = (e) => {
              e.preventDefault();
              const newKey = e.key.toLowerCase();
              if (keyUsed(newKey)) {
                alert(`Key "${newKey}" is already assigned to another shortcut.`);
                span.textContent = oldKey;
              } else {
                if (button.dataset.action) {
                  keyboardShortcuts[button.dataset.action] = newKey;
                } else if (button.dataset.index) {
                  keyboardShortcuts.labels[Number(button.dataset.index)] = newKey;
                }
                span.textContent = newKey;
                localStorage.setItem(
                  LOCAL_STORAGE_PREFIX + "KeyboardShortcuts",
                  JSON.stringify(keyboardShortcuts)
                );
              }
              startKeyboardShortcuts();
              document.removeEventListener("keydown", keyboardListener2);
            };
            document.addEventListener("keydown", keyboardListener2, { once: true });
          });
        });
      }
      const keyboardShortcutsButton = document.createElement("button");
      const keyboardShortcutsIcon = document.createElement("i");
      keyboardShortcutsIcon.className = "fa fa-keyboard-o fa-fw";
      keyboardShortcutsButton.appendChild(keyboardShortcutsIcon);
      keyboardShortcutsButton.addEventListener("click", () => {
        showDialog("Keyboard shortcuts", makeShortcutsTable(keyboardShortcuts, trial.labels));
        captureNewShortcut();
      });
      toolbarL.appendChild(keyboardShortcutsButton);
      const jsPsych = this.jsPsych;
      let keyboardListener = null;
      function startKeyboardShortcuts() {
        if (keyboardListener) {
          jsPsych.pluginAPI.cancelKeyboardResponse(keyboardListener);
        }
        keyboardListener = jsPsych.pluginAPI.getKeyboardResponse({
          callback_function: (info2) => {
            const element = document.activeElement;
            if (element && (element.tagName === "INPUT" || element.tagName === "TEXTAREA" || element.isContentEditable) || dialog.open) {
              return;
            }
            switch (info2.key.toLowerCase()) {
              case keyboardShortcuts.all_items:
                allItemsButton.click();
                break;
              case keyboardShortcuts.guidelines:
                guidelinesButton.click();
                break;
              case keyboardShortcuts.keyboard_shortcuts:
                keyboardShortcutsButton.click();
                break;
              case keyboardShortcuts.rapid_mode:
                rapidModeButton.click();
                break;
              case keyboardShortcuts.prev:
                prevButton.click();
                break;
              case keyboardShortcuts.next:
                nextButton.click();
                break;
              case keyboardShortcuts.save:
                saveButton.click();
                break;
            }
            const labelIdx = keyboardShortcuts.labels.indexOf(info2.key.toLowerCase());
            if (labelIdx !== -1 && labelIdx < labelButtons.length) {
              labelButtons[labelIdx].click();
              if (!trial.multi_labels && rapidMode && curIdx < annotatedDataset.length - 1) {
                setTimeout(() => {
                  curIdx++;
                  updateUi();
                }, 50);
              }
            }
          },
          valid_responses: [
            ...Object.entries(keyboardShortcuts).filter(([k]) => k !== "labels").map(([, v]) => v),
            ...keyboardShortcuts.labels
          ],
          persist: true,
          allow_held_key: false
        });
      }
      display_element.addEventListener("focusin", (e) => {
        const elem = e.target;
        if (elem.tagName === "INPUT" || elem.tagName === "TEXTAREA" || elem.isContentEditable) {
          this.jsPsych.pluginAPI.cancelKeyboardResponse(keyboardListener);
        }
      });
      display_element.addEventListener("focusout", (e) => {
        const elem = e.target;
        if (elem.tagName === "INPUT" || elem.tagName === "TEXTAREA" || elem.isContentEditable) {
          startKeyboardShortcuts();
        }
      });
      const progressContainer = document.createElement("div");
      progressContainer.id = "jspsych-annotation-tool-progress-container";
      toolbar.appendChild(progressContainer);
      const progressBar = document.createElement("progress");
      progressBar.max = annotatedDataset.length;
      progressBar.value = 0;
      progressContainer.appendChild(progressBar);
      const progressText = document.createElement("span");
      progressContainer.appendChild(progressText);
      let rapidMode = false;
      const rapidModeButton = document.createElement("button");
      rapidModeButton.className = "rapid-mode-button";
      const rapidModeIcon = document.createElement("i");
      rapidModeIcon.className = "fa fa-bolt fa-fw";
      rapidModeButton.appendChild(rapidModeIcon);
      if (trial.multi_labels) {
        rapidModeButton.disabled = true;
        rapidModeButton.title = "Rapid mode disabled in multi-label mode";
      }
      rapidModeButton.addEventListener("click", () => {
        rapidMode = !rapidMode;
        rapidModeButton.classList.toggle("active", rapidMode);
      });
      toolbarR.appendChild(rapidModeButton);
      const prevButton = document.createElement("button");
      const prevIcon = document.createElement("i");
      prevIcon.className = "fa fa-chevron-left fa-fw";
      prevButton.appendChild(prevIcon);
      prevButton.disabled = curIdx === 0;
      prevButton.addEventListener("click", () => {
        if (curIdx > 0) {
          curIdx--;
          updateUi();
        }
      });
      toolbarR.appendChild(prevButton);
      const nextButton = document.createElement("button");
      const nextIcon = document.createElement("i");
      nextIcon.className = "fa fa-chevron-right fa-fw";
      nextButton.appendChild(nextIcon);
      nextButton.addEventListener("click", () => {
        if (curIdx < annotatedDataset.length - 1) {
          curIdx++;
          updateUi();
        }
      });
      toolbarR.appendChild(nextButton);
      const saveButton = document.createElement("button");
      const saveIcon = document.createElement("i");
      saveIcon.className = "fa fa-save fa-fw";
      saveButton.appendChild(saveIcon);
      saveButton.addEventListener("click", () => {
        showDialog(
          "Save to GitHub",
          `<div class="name-token-container">
         <div class="row">
         <label for="annotatorName">Name:</label>
         <input id="annotatorName" name="annotatorName" value="${localStorage.getItem(LOCAL_STORAGE_PREFIX + "AnnotatorName") ?? ""}">
         </div>
         <div class="row">
         <label for="token">Token:</label>
         <input type="password" id="token" name="token" value="${localStorage.getItem(LOCAL_STORAGE_PREFIX + "Token") ?? ""}">
         </div>
         </div>
         <p>Name may only contain the letters A-Z, numbers, spaces, and hyphens (-).
         It must not start or end with a hyphen.</p>
         <p>Use the access token your organiser shared with you.</p>
         <p>Name and token are saved locally.</p>
         <div class="save-buttons">
         <button id="save-and-continue">save and continue</button>
         <button id="save-and-end">save and end</button>
         </div>`
        );
        const saveAndContinue = document.getElementById("save-and-continue");
        saveAndContinue.addEventListener("click", async () => {
          await saveToGitHub(false);
        });
        const saveAndEnd = document.getElementById("save-and-end");
        saveAndEnd.addEventListener("click", async () => {
          await saveToGitHub(true);
        });
      });
      toolbarR.appendChild(saveButton);
      async function saveToGitHub(endAfter) {
        const saveAndContinue = document.getElementById("save-and-continue");
        const saveAndEnd = document.getElementById("save-and-end");
        saveAndContinue.disabled = true;
        saveAndEnd.disabled = true;
        const tokenInput = document.getElementById("token");
        const nameInput = document.getElementById("annotatorName");
        const token = tokenInput?.value.trim();
        const annotatorRaw = nameInput?.value.trim();
        if (!annotatorRaw) {
          saveAndContinue.disabled = false;
          saveAndEnd.disabled = false;
          return alert("Please enter an annotator name.");
        }
        if (!/^[A-Za-z0-9 -]+$/.test(annotatorRaw) || annotatorRaw.startsWith("-") || annotatorRaw.endsWith("-")) {
          saveAndContinue.disabled = false;
          saveAndEnd.disabled = false;
          return alert(
            "Name may only contain the letters A-Z, numbers, spaces, and hyphens (-). It must not start or end with a hyphen."
          );
        }
        const annotatorBranch = annotatorRaw.toLowerCase().replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
        if (!token) {
          saveAndContinue.disabled = false;
          saveAndEnd.disabled = false;
          return alert("Please enter a GitHub token.");
        }
        localStorage.setItem(LOCAL_STORAGE_PREFIX + "AnnotatorName", annotatorRaw);
        localStorage.setItem(LOCAL_STORAGE_PREFIX + "Token", token);
        annotatedDataset.forEach((item) => {
          if (Array.isArray(item.label)) {
            item.label = item.label.map(Number).sort((a, b) => a - b);
          }
        });
        const trialData = {
          annotator: annotatorRaw,
          annotated_dataset: annotatedDataset
        };
        try {
          const response = await fetch(
            `https://api.github.com/repos/${(trial.owner ?? "").trim()}/${(trial.repo ?? "").trim()}/actions/workflows/${trial.workflow.trim()}/dispatches`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github+json",
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                ref: "main",
                inputs: {
                  annotator: annotatorBranch,
                  dataset: JSON.stringify(trialData, null, 2)
                }
              })
            }
          );
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText);
          }
          saveAndContinue.disabled = false;
          saveAndEnd.disabled = false;
          const successMsg = endAfter ? "Annotations successfully saved to GitHub. Quitting. Reload to reopen." : "Annotations successfully saved to GitHub. You may continue annotating.";
          alert(successMsg);
          if (endAfter) {
            jsPsych.pluginAPI.cancelAllKeyboardResponses();
            jsPsych.finishTrial(trialData);
          }
        } catch (error) {
          console.error(error);
          saveAndContinue.disabled = false;
          saveAndEnd.disabled = false;
          alert(
            "Failed to save annotations to GitHub. Check your input. Check console for details."
          );
        }
      }
      const labelsContainer = document.createElement("div");
      labelsContainer.id = "jspsych-annotation-tool-labels-container";
      display_element.appendChild(labelsContainer);
      const labelButtons = [];
      trial.labels.forEach((label, labelIdx) => {
        const labelButton = document.createElement("button");
        labelButton.className = "jspsych-annotation-tool-label-button";
        labelButton.textContent = label;
        labelButton.addEventListener("click", () => {
          const item = annotatedDataset[curIdx];
          if (trial.multi_labels) {
            if (!Array.isArray(item.label)) {
              item.label = [];
            }
            const labels = item.label;
            const pos = labels.indexOf(labelIdx);
            if (pos === -1) {
              labels.push(labelIdx);
            } else {
              labels.splice(pos, 1);
            }
            if (labels.length === 0) {
              delete item.label;
            }
          } else {
            if (item.label === labelIdx) {
              delete item.label;
            } else {
              item.label = labelIdx;
            }
          }
          updateUi();
        });
        labelButtons.push(labelButton);
        labelsContainer.appendChild(labelButton);
      });
      const itemContainer = document.createElement("div");
      itemContainer.id = "jspsych-annotation-tool-item-container";
      display_element.appendChild(itemContainer);
      const itemText = document.createElement("p");
      itemText.id = "jspsych-annotation-tool-item";
      itemContainer.appendChild(itemText);
      const itemMetadata = document.createElement("p");
      itemMetadata.id = "jspsych-annotation-tool-metadata";
      itemContainer.appendChild(itemMetadata);
      function updateUi() {
        const item = annotatedDataset[curIdx];
        itemText.textContent = item.text;
        itemMetadata.textContent = makeMetadataString(item, curIdx, annotatedDataset.length);
        prevButton.disabled = curIdx === 0;
        nextButton.disabled = curIdx === annotatedDataset.length - 1;
        const curLabels = annotatedDataset[curIdx].label;
        labelButtons.forEach((labelButton, labelButtonIdx) => {
          if (Array.isArray(curLabels)) {
            labelButton.classList.toggle("is-selected", curLabels.includes(labelButtonIdx));
          } else {
            labelButton.classList.toggle("is-selected", labelButtonIdx === curLabels);
          }
        });
        const numLabelledItems = annotatedDataset.filter((item2) => item2.label !== void 0).length;
        progressBar.value = numLabelledItems;
        progressText.textContent = `${numLabelledItems} of ${annotatedDataset.length} annotated`;
        itemButtons.forEach((itemButton, itemButtonIdx) => {
          if (itemButtonIdx === curIdx) {
            itemButton.classList.add("highlighted");
            itemButton.disabled = true;
          } else {
            itemButton.classList.remove("highlighted");
            itemButton.disabled = false;
          }
        });
        localStorage.setItem(LOCAL_STORAGE_PREFIX, JSON.stringify(annotatedDataset));
        localStorage.setItem(LOCAL_STORAGE_PREFIX + "Index", String(curIdx));
      }
      updateUi();
      startKeyboardShortcuts();
    }
  }

  return AnnotationToolPlugin;

})(jsPsychModule);
//# sourceMappingURL=index.browser.js.map
