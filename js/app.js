"use strict";

    const DATA = window.UNLOCK_DATA;
    const PUZZLES = DATA.puzzles.map(puzzle => ({
      ...puzzle,
      hint1: puzzle.hints[0],
      hint2: puzzle.hints[1]
    }));
    const FINAL_REVEAL = DATA.finalReveal;
    const THIRD_ANSWER = DATA.third.answer;
    const THIRD_HINT = {
      label: DATA.third.label,
      hint1: DATA.third.hints[0],
      hint2: DATA.third.hints[1]
    };

    const $ = selector => document.querySelector(selector);
    const $$ = selector => [...document.querySelectorAll(selector)];

    const page1 = $("#page1");
    const page2 = $("#page2");
    const page3 = $("#page3");
    const page4 = $("#page4");
    const page1Next = $("#page1Next");
    const page2Next = $("#page2Next");
    const page3Next = $("#page3Next");
    const puzzleArea = $("#puzzleArea");
    const unlockMessage = $("#unlockMessage");
    const finalBoxes = $$("#finalBoxes .final-letter");
    const thirdMessage = $("#thirdMessage");
    const thirdAnswerPanel = $("#thirdAnswerPanel");
    const thirdAnswerInput = $("#thirdAnswerInput");
    const thirdCheckButton = $("#thirdCheckButton");
    const thirdHintButton = $("#thirdHintButton");
    const thirdResult = $("#thirdResult");
    const previousAnswerButton = $("#previousAnswerButton");
    const memoryPhoto = $("#memoryPhoto");
    const page4AnswerInput = $("#page4AnswerInput");
    const page4VisualBoxes = $$("#page4Boxes .jp-letter");
    const page4CheckButton = $("#page4CheckButton");
    const page4Result = $("#page4Result");
    const page4PreviousButton = $("#page4PreviousButton");
    const page4Next = $("#page4Next");
    const page4CinemaShade = $("#page4CinemaShade");
    const memoryVideo = $("#memoryVideo");

    const hintModal = $("#hintModal");
    const hintCloseButton = $("#hintCloseButton");
    const hintDialogTitle = $("#hintDialogTitle");
    const hintOne = $("#hintOne");
    const hintTwo = $("#hintTwo");

    const state = {
      currentPage: 1,
      solvedPuzzles: new Set(),
      page2Typed: false,
      page3Typed: false,
      thirdSolved: false,
      page4Solved: false,
      page4Composing: false,
      soundEnabled: true,
      lastHintTrigger: null,
      stableViewportWidth: 0,
      stableViewportHeight: 0
    };

    function getLayoutViewport() {
      return {
        width: document.documentElement.clientWidth || window.innerWidth,
        height: window.innerHeight
      };
    }

    const startOverlay = $("#startOverlay");
    const startButton = $("#startButton");
    const soundToggle = $("#soundToggle");
    const resetProgress = $("#resetProgress");
    let audioContext = null;

    function saveProgress() {
      const payload = {
        currentPage: state.currentPage,
        solvedPuzzleIds: [...state.solvedPuzzles],
        page2Typed: state.page2Typed,
        page3Typed: state.page3Typed,
        thirdSolved: state.thirdSolved,
        page4Solved: state.page4Solved,
        soundEnabled: state.soundEnabled
      };
      localStorage.setItem(DATA.storageKey, JSON.stringify(payload));
    }

    function loadProgress() {
      try {
        const saved = JSON.parse(localStorage.getItem(DATA.storageKey) || "null");
        if (!saved) return;
        state.currentPage = Number(saved.currentPage) || 1;
        state.solvedPuzzles = new Set(saved.solvedPuzzleIds || []);
        state.page2Typed = Boolean(saved.page2Typed);
        state.page3Typed = Boolean(saved.page3Typed);
        state.thirdSolved = Boolean(saved.thirdSolved);
        state.page4Solved = Boolean(saved.page4Solved);
        state.soundEnabled = saved.soundEnabled !== false;
      } catch (error) {
        localStorage.removeItem(DATA.storageKey);
      }
    }

    function resetSavedProgress() {
      localStorage.removeItem(DATA.storageKey);
      window.location.reload();
    }

    function updateSoundButton() {
      soundToggle.textContent = state.soundEnabled ? "SOUND ON" : "SOUND OFF";
      soundToggle.setAttribute("aria-pressed", String(state.soundEnabled));
      soundToggle.classList.toggle("sound-muted", !state.soundEnabled);
    }

    function playTypeClick() {
      if (!state.soundEnabled) return;
      try {
        audioContext ||= new (window.AudioContext || window.webkitAudioContext)();

        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.type = "square";
        oscillator.frequency.setValueAtTime(760, audioContext.currentTime);
        gain.gain.setValueAtTime(.025, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + .035);

        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + .04);
      } catch (error) {
        // Audio feedback is optional.
      }
    }

    soundToggle.addEventListener("click", () => {
      state.soundEnabled = !state.soundEnabled;
      updateSoundButton();
      saveProgress();
    });

    resetProgress.addEventListener("click", () => {
      if (window.confirm("保存された進行状況をリセットしますか？")) {
        resetSavedProgress();
      }
    });

    startButton.addEventListener("click", () => {
      startOverlay.classList.add("hide");

      const firstInput = document.querySelector(".puzzle-real-input:not([readonly])");
      setTimeout(() => {
        firstInput?.focus({ preventScroll: true });
      }, 120);

      setTimeout(() => {
        startOverlay.hidden = true;
      }, 420);
    });

    function fitPageToViewport(forceReset = false) {
      const current = getLayoutViewport();
      const widthChanged = Math.abs(current.width - state.stableViewportWidth) > 48;

      if (forceReset || widthChanged || !state.stableViewportHeight) {
        state.stableViewportWidth = current.width;
        state.stableViewportHeight = current.height;
      } else {
        state.stableViewportHeight = Math.max(state.stableViewportHeight, current.height);
      }

      const safeX =
        (parseFloat(getComputedStyle(document.documentElement)
          .getPropertyValue("--safe-x")) || 0) + 8;
      const safeY = 8;

      const scale = Math.min(
        (state.stableViewportWidth - safeX * 2) / 900,
        (state.stableViewportHeight - safeY * 2) / 1350,
        1
      );

      document.documentElement.style.setProperty(
        "--page-scale",
        String(Math.max(scale, .1))
      );
    }

    function adjustForKeyboard() {
      const active = document.activeElement;
      const isEditable =
        active &&
        (active.matches("input, textarea, [contenteditable='true']"));

      if (!isEditable) {
        document.documentElement.style.setProperty("--keyboard-shift", "0px");
        return;
      }

      const viewport = window.visualViewport;
      if (!viewport) return;

      document.documentElement.style.setProperty("--keyboard-shift", "0px");

      requestAnimationFrame(() => {
        const rect = active.getBoundingClientRect();
        const visibleTop = viewport.offsetTop + 18;
        const visibleBottom = viewport.offsetTop + viewport.height - 22;
        let shift = 0;

        if (rect.bottom > visibleBottom) {
          shift = visibleBottom - rect.bottom;
        }
        if (rect.top + shift < visibleTop) {
          shift += visibleTop - (rect.top + shift);
        }

        shift = Math.max(-300, Math.min(0, shift));
        document.documentElement.style.setProperty(
          "--keyboard-shift",
          `${shift}px`
        );
      });
    }

    function setActivePage(page) {
      state.currentPage = Number(page.id.replace("page", ""));
      [page1, page2, page3, page4].forEach(item => {
        const active = item === page;
        item.classList.toggle("active-page", active);
        item.setAttribute("aria-hidden", String(!active));
      });
      saveProgress();
    }

    function revealButton(button) {
      button.hidden = false;
      button.classList.add("reveal");
    }

    function openHint(data, trigger) {
      state.lastHintTrigger = trigger;
      hintDialogTitle.textContent = data.label;
      hintOne.textContent = data.hint1;
      hintTwo.textContent = data.hint2;
      $$("#hintModal details").forEach(detail => detail.open = false);
      hintModal.hidden = false;
      document.body.classList.add("modal-open");
      hintCloseButton.focus();
    }

    function closeHint() {
      hintModal.hidden = true;
      document.body.classList.remove("modal-open");
      state.lastHintTrigger?.focus();
    }

    function typePlainText(element, text, interval, done) {
      let index = 0;
      element.textContent = "";
      const timer = setInterval(() => {
        element.textContent += text[index++];
        if (index >= text.length) {
          clearInterval(timer);
          setTimeout(() => done?.(), 600);
        }
      }, interval);
    }

    function typeRichText(element, segments, interval, done) {
      const units = segments.flatMap(segment =>
        [...segment.text].map(char => ({ char, accent: segment.accent }))
      );
      let index = 0;
      element.innerHTML = "";

      const timer = setInterval(() => {
        const unit = units[index++];
        if (unit.char === "\n") {
          element.appendChild(document.createElement("br"));
        } else {
          const span = document.createElement("span");
          span.textContent = unit.char;
          if (unit.accent) span.className = "accent";
          element.appendChild(span);
        }

        if (index >= units.length) {
          clearInterval(timer);
          setTimeout(() => done?.(), 600);
        }
      }, interval);
    }

    function buildPuzzle(puzzle, puzzleIndex) {
      const section = document.createElement("section");
      section.className = "puzzle";
      section.dataset.puzzleIndex = String(puzzleIndex);

      const visualBoxes = Array.from({ length: puzzle.length }, () => `
        <div class="letter" aria-hidden="true"></div>
      `).join("");

      const locks = Array.from({ length: puzzle.length }, (_, index) => `
        <div class="lock-slot">
          ${Object.prototype.hasOwnProperty.call(puzzle.locks, index)
            ? `<div class="padlock">${puzzle.locks[index]}</div>`
            : `<div class="padlock hidden"></div>`}
        </div>
      `).join("");

      section.innerHTML = `
        <h2 class="puzzle-title">${puzzle.label}</h2>
        <div class="answer-row">
          <div class="answer-block">
            <div class="puzzle-input-wrap" style="--count:${puzzle.length}">
              <input
                class="puzzle-real-input"
                type="text"
                inputmode="latin"
                lang="en"
                maxlength="${puzzle.length}"
                pattern="[A-Za-z]+"
                autocomplete="off"
                autocapitalize="characters"
                autocorrect="off"
                spellcheck="false"
                enterkeyhint="${puzzleIndex < PUZZLES.length - 1 ? "next" : "done"}"
                aria-label="${puzzle.label}の回答"
              >
              <div class="boxes puzzle-visual-boxes" style="--count:${puzzle.length}">
                ${visualBoxes}
              </div>
            </div>
            <div class="locks" style="--count:${puzzle.length}">${locks}</div>
          </div>
          <div class="puzzle-controls">
            <button class="metal-btn check-btn" type="button">CHECK</button>
            <button class="paper-btn hint-btn" type="button">HINT</button>
          </div>
        </div>
        <div class="result"></div>
      `;

      puzzleArea.appendChild(section);

      const realInput = section.querySelector(".puzzle-real-input");
      const visualLetters = [...section.querySelectorAll(".puzzle-visual-boxes .letter")];
      const checkButton = section.querySelector(".check-btn");
      const hintButton = section.querySelector(".hint-btn");
      const result = section.querySelector(".result");

      if (state.solvedPuzzles.has(puzzle.id)) {
        realInput.value = puzzle.answer;
        realInput.readOnly = true;
        section.classList.add("solved");
        result.textContent = "CORRECT";
        result.classList.add("correct");
        section.querySelectorAll(".padlock:not(.hidden)").forEach(lock => lock.classList.add("open"));
        checkButton.disabled = true;
        checkButton.textContent = "UNLOCKED";
      }

      function renderPuzzleInput() {
        const chars = [...realInput.value].slice(0, puzzle.length);

        visualLetters.forEach((box, index) => {
          const nextChar = chars[index] || "";
          const changed = box.textContent !== nextChar;
          box.textContent = nextChar;

          if (changed && nextChar) {
            box.classList.remove("typed-pop");
            void box.offsetWidth;
            box.classList.add("typed-pop");
          }
        });
      }

      function normalizePuzzleInput() {
        const cleaned = realInput.value
          .toUpperCase()
          .replace(/[^A-Z]/g, "");

        /*
         * iPhone Safariで1回の入力がDDのように重複した場合に、
         * 連続した同一文字を1文字へ補正します。
         * 今回の4つの正解には同じ英字が連続する単語はありません。
         */
        const previous = realInput.dataset.previousValue || "";
        let normalized = cleaned.slice(0, puzzle.length);

        // Safariが1回の入力イベントで同じ文字を2個追加した場合だけ補正。
        // BOOK / MOON のような意図的な連続文字はそのまま入力できます。
        const inserted = normalized.slice(previous.length);
        if (inserted.length === 2 && inserted[0] === inserted[1]) {
          normalized = previous + inserted[0];
        }

        realInput.value = normalized;
        realInput.dataset.previousValue = normalized;

        renderPuzzleInput();
        result.textContent = "";
        result.className = "result";
      }

      renderPuzzleInput();

      realInput.addEventListener("input", () => {
        normalizePuzzleInput();
        playTypeClick();
      });

      realInput.addEventListener("keydown", event => {
        if (event.key === "Enter") {
          event.preventDefault();
          checkButton.click();
        }
      });

      section.querySelector(".puzzle-input-wrap").addEventListener("click", () => {
        realInput.focus({ preventScroll: true });
      });

      realInput.addEventListener("paste", event => {
        event.preventDefault();
        realInput.value = event.clipboardData
          .getData("text")
          .toUpperCase()
          .replace(/[^A-Z]/g, "")
          .slice(0, puzzle.length);
        normalizePuzzleInput();
      });

      hintButton.addEventListener("click", () => openHint(puzzle, hintButton));

      checkButton.addEventListener("click", () => {
        const answer = realInput.value.toUpperCase();
        result.className = "result";

        if (answer.length !== puzzle.length) {
          result.textContent = "PLEASE COMPLETE";
          result.classList.add("wrong");
          return;
        }

        if (answer === puzzle.answer) {
          section.classList.add("solved");
          result.textContent = "CORRECT";
          result.classList.add("correct");
          section.querySelectorAll(".padlock:not(.hidden)").forEach(lock => lock.classList.add("open"));
          checkButton.disabled = true;
          checkButton.textContent = "UNLOCKED";
          state.solvedPuzzles.add(puzzle.id);
          saveProgress();

          const nextInput = [...document.querySelectorAll(".puzzle-real-input")]
            .find(input => !input.readOnly && input !== realInput);

          if (nextInput) {
            setTimeout(() => {
              nextInput.focus({ preventScroll: true });
              realInput.readOnly = true;
            }, 180);
          } else {
            realInput.readOnly = true;
          }

          if (state.solvedPuzzles.size === PUZZLES.length) {
            realInput.blur();
            document.documentElement.style.setProperty("--keyboard-shift", "0px");
            revealButton(page1Next);
            setTimeout(() => page1Next.focus({ preventScroll: true }), 250);
          }
        } else {
          result.textContent = "INCORRECT";
          result.classList.add("wrong");
        }
      });
    }

    loadProgress();
    PUZZLES.forEach(buildPuzzle);

    page1Next.addEventListener("click", () => {
      page1Next.hidden = true;
      setActivePage(page2);
      requestAnimationFrame(() => page1.classList.add("turn-left"));

      if (!state.page2Typed) {
        state.page2Typed = true;
        setTimeout(() => {
          typePlainText(unlockMessage, "8つのロックが解除された", 150, () => {
            setTimeout(() => {
              FINAL_REVEAL.split("").forEach((char, index) => {
                setTimeout(() => {
                  finalBoxes[index].textContent = char;
                  const caret = document.createElement("span");
                  caret.className = "type-caret";
                  finalBoxes[index].appendChild(caret);
                  setTimeout(() => caret.remove(), 420);

                  if (index === FINAL_REVEAL.length - 1) {
                    setTimeout(() => revealButton(page2Next), 700);
                  }
                }, 350 + index * 520);
              });
            }, 350);
          });
        }, 1500);
      }
    });

    page2Next.addEventListener("click", () => {
      page2Next.hidden = true;
      setActivePage(page3);
      requestAnimationFrame(() => page2.classList.add("turn-left"));

      if (!state.page3Typed) {
        state.page3Typed = true;
        setTimeout(() => {
          typeRichText(
            thirdMessage,
            [
              { text: "3", accent: true },
              { text: "つの", accent: false },
              { text: "星", accent: true },
              { text: "に隠された数字から\n思い出の", accent: false },
              { text: "Word", accent: true },
              { text: "が現れる", accent: false }
            ],
            110,
            () => {
              thirdAnswerPanel.classList.add("show");
              thirdAnswerInput.focus();
            }
          );
        }, 1500);
      }
    });

    previousAnswerButton.addEventListener("click", () => {
      // Return immediately without a page-turn animation.
      page3.classList.remove("turn-left", "turn-right", "back-turn");
      page2.classList.remove("turn-left");
      setActivePage(page2);
      revealButton(page2Next);
    });

    thirdHintButton.addEventListener("click", () => openHint(THIRD_HINT, thirdHintButton));

    thirdAnswerInput.addEventListener("input", () => {
      thirdAnswerInput.value = thirdAnswerInput.value
        .toUpperCase()
        .replace(/[^A-Z]/g, "")
        .slice(0, 6);

      thirdResult.textContent = "";
      thirdResult.className = "third-result";
    });

    thirdAnswerInput.addEventListener("keydown", event => {
      if (event.key === "Enter") thirdCheckButton.click();
    });

    thirdCheckButton.addEventListener("click", () => {
      const answer = thirdAnswerInput.value.trim().toUpperCase();
      thirdResult.className = "third-result";

      if (!answer) {
        thirdResult.textContent = "PLEASE ENTER YOUR ANSWER";
        thirdResult.classList.add("wrong");
      } else if (answer === THIRD_ANSWER) {
        thirdResult.textContent = "CORRECT";
        thirdResult.classList.add("correct");
        thirdAnswerInput.disabled = true;
        thirdCheckButton.disabled = true;
        thirdCheckButton.textContent = "UNLOCKED";
        state.thirdSolved = true;
        saveProgress();
        revealButton(page3Next);
      } else {
        thirdResult.textContent = "INCORRECT";
        thirdResult.classList.add("wrong");
      }
    });

    page3Next.addEventListener("click", () => {
      page3Next.hidden = true;
      setActivePage(page4);
      requestAnimationFrame(() => page3.classList.add("turn-left"));
      setTimeout(() => page4AnswerInput.focus(), 1900);
    });


    const PAGE4_ANSWER = DATA.page4Answer;
    

    function renderPage4Value(value) {
      const chars = [...value].slice(0, 5);

      page4VisualBoxes.forEach((box, index) => {
        box.textContent = chars[index] || "";
      });
    }

    function renderPage4Answer() {
      renderPage4Value(page4AnswerInput.value);
    }

    function normalizePage4Answer() {
      page4AnswerInput.value = [...page4AnswerInput.value]
        .filter(char => /[\u3041-\u3096ー]/.test(char))
        .slice(0, 5)
        .join("");

      renderPage4Answer();
      page4Result.textContent = "";
      page4Result.className = "page4-result";
    }

    page4AnswerInput.addEventListener("compositionstart", () => {
      state.page4Composing = true;
      $("#page4InputWrap").classList.add("is-composing");
    });

    page4AnswerInput.addEventListener("compositionupdate", event => {
      renderPage4Value(event.data || page4AnswerInput.value);
      page4Result.textContent = "";
      page4Result.className = "page4-result";
    });

    page4AnswerInput.addEventListener("compositionend", () => {
      state.page4Composing = false;
      $("#page4InputWrap").classList.remove("is-composing");
      normalizePage4Answer();
    });

    page4AnswerInput.addEventListener("input", event => {
      if (state.page4Composing) {
        renderPage4Value(event.data || page4AnswerInput.value);
        page4Result.textContent = "";
        page4Result.className = "page4-result";
        return;
      }

      normalizePage4Answer();
    });

    page4AnswerInput.addEventListener("keydown", event => {
      if (event.key === "Enter" && !page4Composing) {
        page4CheckButton.click();
      }
    });

    $("#page4InputWrap").addEventListener("click", () => {
      page4AnswerInput.focus();
    });

    page4CheckButton.addEventListener("click", () => {
      if (state.page4Composing) return;

      normalizePage4Answer();
      const answer = page4AnswerInput.value;

      page4Result.className = "page4-result";

      if (answer.length !== PAGE4_ANSWER.length) {
        page4Result.textContent = "PLEASE COMPLETE";
        page4Result.classList.add("wrong");
        page4AnswerInput.focus();
        return;
      }

      if (answer === PAGE4_ANSWER) {
        page4Result.textContent = "CORRECT";
        page4Result.classList.add("correct");
        page4AnswerInput.disabled = true;
        page4CheckButton.disabled = true;
        page4CheckButton.setAttribute("aria-disabled", "true");
        page4CheckButton.tabIndex = -1;
        page4CheckButton.textContent = "UNLOCKED";
        page4CheckButton.blur();
        state.page4Solved = true;
        saveProgress();
        revealButton(page4Next);
      } else {
        page4Result.textContent = "INCORRECT";
        page4Result.classList.add("wrong");
        page4AnswerInput.focus();
      }
    });

    async function startEndingVideo() {
      try {
        if (memoryVideo.readyState === 0) {
          memoryVideo.load();
        }
        memoryVideo.currentTime = 0;
        await memoryVideo.play();
        memoryPhoto.classList.add("video-playing");
      } catch (error) {
        // Until ending.mp4 is added, the enlarged still image remains visible.
        console.info("ending.mp4 is not available yet.");
      }
    }

    function popupMemoryPhotoFromCenter() {
      const startRect = memoryPhoto.getBoundingClientRect();
      const viewportWidth = window.visualViewport?.width || window.innerWidth;
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const photoRatio = 127 / 89;

      const targetWidth = Math.min(
        viewportWidth * 0.90,
        viewportHeight * 0.82 * photoRatio,
        1100
      );
      const targetHeight = targetWidth / photoRatio;
      const targetLeft = (viewportWidth - targetWidth) / 2;
      const targetTop = (viewportHeight - targetHeight) / 2;

      // Preserve the exact current screen position before moving it to <body>.
      memoryPhoto.classList.add("popup-fixed");
      Object.assign(memoryPhoto.style, {
        left: `${startRect.left}px`,
        top: `${startRect.top}px`,
        width: `${startRect.width}px`,
        height: `${startRect.height}px`
      });
      document.body.appendChild(memoryPhoto);

      const animation = memoryPhoto.animate(
        [
          {
            left: `${startRect.left}px`,
            top: `${startRect.top}px`,
            width: `${startRect.width}px`,
            height: `${startRect.height}px`
          },
          {
            left: `${targetLeft}px`,
            top: `${targetTop}px`,
            width: `${targetWidth}px`,
            height: `${targetHeight}px`
          }
        ],
        {
          duration: 1250,
          easing: "cubic-bezier(.2,.72,.18,1)",
          fill: "forwards"
        }
      );

      animation.finished.then(() => {
        Object.assign(memoryPhoto.style, {
          left: `${targetLeft}px`,
          top: `${targetTop}px`,
          width: `${targetWidth}px`,
          height: `${targetHeight}px`
        });
        animation.cancel();
        setTimeout(startEndingVideo, 350);
      });
    }

    page4Next.addEventListener("click", () => {
      page4Next.hidden = true;
      page4PreviousButton.disabled = true;

      // First make the existing center photo horizontal.
      memoryPhoto.classList.add("aligned");

      // Then darken the page and enlarge that same photo from its current center.
      setTimeout(() => {
        page4.classList.add("cinema-mode");
        popupMemoryPhotoFromCenter();
      }, 700);
    });

    page4PreviousButton.addEventListener("click", () => {
      page4.classList.remove("turn-left", "turn-right");
      page3.classList.remove("turn-left");
      setActivePage(page3);
      revealButton(page3Next);
    });

    hintCloseButton.addEventListener("click", closeHint);
    hintModal.addEventListener("click", event => {
      if (event.target.hasAttribute("data-close-hint")) closeHint();
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && !hintModal.hidden) closeHint();
      if (event.key === "Tab" && !hintModal.hidden) {
        const focusable = [...hintModal.querySelectorAll("button, summary, [href], input, [tabindex]:not([tabindex='-1'])")];
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });

    function restoreInterface() {
      updateSoundButton();

      if (state.solvedPuzzles.size === PUZZLES.length) revealButton(page1Next);

      if (state.currentPage >= 2 || state.page2Typed) {
        unlockMessage.textContent = "8つのロックが解除された";
        FINAL_REVEAL.split("").forEach((char, index) => {
          finalBoxes[index].textContent = char;
        });
        revealButton(page2Next);
      }

      if (state.currentPage >= 3 || state.page3Typed) {
        thirdMessage.innerHTML = '<span class="accent">3</span>つの<span class="accent">星</span>に隠された数字から<br>思い出の<span class="accent">Word</span>が現れる';
        thirdAnswerPanel.classList.add("show");
      }

      if (state.thirdSolved) {
        thirdAnswerInput.value = THIRD_ANSWER;
        thirdAnswerInput.disabled = true;
        thirdCheckButton.disabled = true;
        thirdCheckButton.textContent = "UNLOCKED";
        thirdAnswerPanel.classList.add("show");
        thirdResult.textContent = "CORRECT";
        thirdResult.classList.add("correct");
        revealButton(page3Next);
      }
      if (state.page4Solved) {
        page4AnswerInput.value = PAGE4_ANSWER;
        renderPage4Answer();
        page4AnswerInput.disabled = true;
        page4CheckButton.disabled = true;
        page4CheckButton.textContent = "UNLOCKED";
        page4Result.textContent = "CORRECT";
        page4Result.classList.add("correct");
        revealButton(page4Next);
      }

      const pages = [page1, page2, page3, page4];
      const target = pages[Math.max(0, Math.min(3, state.currentPage - 1))];
      pages.forEach((page, index) => {
        page.classList.toggle("turn-left", index < state.currentPage - 1);
      });
      setActivePage(target);

      if (state.currentPage > 1) {
        startOverlay.hidden = true;
      } else {
        startButton.textContent = state.solvedPuzzles.size ? "CONTINUE" : "TAP TO START";
      }
    }

    window.addEventListener("resize", () => fitPageToViewport(false));
    window.addEventListener("orientationchange", () => {
      setTimeout(() => fitPageToViewport(true), 120);
    });

    document.addEventListener("focusin", () => {
      setTimeout(adjustForKeyboard, 180);
    });

    document.addEventListener("focusout", () => {
      setTimeout(() => {
        if (!document.activeElement?.matches("input, textarea")) {
          document.documentElement.style.setProperty("--keyboard-shift", "0px");
        }
      }, 180);
    });

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", adjustForKeyboard);
      window.visualViewport.addEventListener("scroll", adjustForKeyboard);
    }

    document.addEventListener("DOMContentLoaded", () => fitPageToViewport(true));

    if (document.fonts?.ready) {
      document.fonts.ready.then(() => fitPageToViewport(false));
    }

    restoreInterface();
    fitPageToViewport(true);
    requestAnimationFrame(() => fitPageToViewport(false));
    setTimeout(() => fitPageToViewport(false), 120);
