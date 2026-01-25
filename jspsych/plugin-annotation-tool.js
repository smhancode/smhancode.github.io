var jsPsychAnnotationTool = (function (jspsych) {
    'use strict';

    var version = "0.0.1";

    const info = {
        name: "plugin-annotation-tool",
        version,
        parameters: {
            dataset: {
                type: jspsych.ParameterType.OBJECT,
                array: true
            },
            labels: {
                type: jspsych.ParameterType.STRING,
                array: true,
                default: void 0
            },
            button_html: {
                type: jspsych.ParameterType.FUNCTION,
                default: function(label, label_index) {
                    return `<button class="jspsych-button">${label}</button>`;
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
            let labelled_dataset = JSON.parse(JSON.stringify(trial.dataset)).sort(
                (a, b) => a.id - b.id
            );
            let cur_index = 0;
            const nav_buttons_element = document.createElement("div");
            nav_buttons_element.id = "jspsych-annotation-tool-nav-buttons";
            nav_buttons_element.style.display = "flex";
            nav_buttons_element.style.gap = "8px";
            nav_buttons_element.style.alignItems = "center";
            display_element.appendChild(nav_buttons_element);
            const prev_button = document.createElement("button");
            prev_button.innerHTML = "previous";
            prev_button.addEventListener("click", () => {
                if (cur_index > 0) {
                    cur_index--;
                    update_text();
                }
            });
            nav_buttons_element.appendChild(prev_button);
            const next_button = document.createElement("button");
            next_button.innerHTML = "next";
            next_button.addEventListener("click", () => {
                if (cur_index < trial.dataset.length - 1) {
                    cur_index++;
                    update_text();
                }
            });
            nav_buttons_element.appendChild(next_button);
            const annotator_name_input = document.createElement("input");
            annotator_name_input.type = "text";
            annotator_name_input.placeholder = "annotator name";
            annotator_name_input.style.marginLeft = "10px";
            nav_buttons_element.appendChild(annotator_name_input);
            const finish_button = document.createElement("button");
            finish_button.innerHTML = "finish";
            finish_button.addEventListener("click", () => {
                const trial_data = {
                    annotator: annotator_name_input.value,
                    labelled_dataset
                };
                const blob = new Blob([JSON.stringify([trial_data], null, 2)], { type: "application/json" });
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = `${trial_data.annotator}.json`;
                link.click();
            });
            nav_buttons_element.appendChild(finish_button);
            const label_select_element = document.createElement("select");
            label_select_element.id = "jspsych-annotation-tool-label-select";
            const placeholder_option = document.createElement("option");
            placeholder_option.value = "";
            placeholder_option.textContent = "-- select label --";
            label_select_element.appendChild(placeholder_option);
            trial.labels.forEach((label, label_index) => {
                const option = document.createElement("option");
                option.value = label_index.toString();
                option.textContent = label;
                label_select_element.appendChild(option);
            });
            label_select_element.addEventListener("change", () => {
                const value = label_select_element.value;
                if (value === "") {
                    delete labelled_dataset[cur_index].label;
                } else {
                    labelled_dataset[cur_index].label = Number(value);
                }
            });
            display_element.appendChild(label_select_element);
            const text_element = document.createElement("div");
            text_element.id = "jspsych-annotation-tool-text";
            display_element.appendChild(text_element);
            const update_label_select = () => {
                const label = labelled_dataset[cur_index].label;
                label_select_element.value = label === void 0 ? "" : label.toString();
            };
            const update_text = () => {
                const entry = labelled_dataset[cur_index];
                text_element.dataset.id = entry.id;
                text_element.innerHTML = entry.text;
                prev_button.disabled = cur_index === 0;
                next_button.disabled = cur_index === labelled_dataset.length - 1;
                update_label_select();
            };
            update_text();
        }
    }

    return AnnotationToolPlugin;

})(jsPsychModule);
//# sourceMappingURL=index.browser.js.map
