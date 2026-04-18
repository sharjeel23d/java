// ==UserScript==
// @name         Spain Visa Slot Random Selector
// @namespace    https://appointment.thespainvisa.com/
// @version      1.0.0
// @description  Randomly selects an available date and time slot, then submits on SlotSelection page.
// @match        https://appointment.thespainvisa.com/Global/Appointment/SlotSelection*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const MAX_WAIT_MS = 10000;
  const STEP_DELAY_MS = 1000;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const randomItem = (items) => items[Math.floor(Math.random() * items.length)];

  const isVisible = (el) => !!(el && el.offsetParent !== null);
  const isEnabled = (el) => !el.disabled && el.getAttribute('aria-disabled') !== 'true';
  const canClick = (el) => isVisible(el) && isEnabled(el);

  const clickElement = (el) => {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.click();
  };

  const waitFor = async (finder, timeoutMs) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const result = finder();
      if (result && result.length) return result;
      await sleep(250);
    }
    return [];
  };

  const findDateOptions = () =>
    Array.from(
      document.querySelectorAll(
        [
          'button[data-date]:not([disabled])',
          '.fc-daygrid-day:not(.fc-day-disabled):not(.disabled)',
          '.calendar td.available:not(.disabled)',
          'input[name*="Date"]:not([disabled])',
          'input[id*="Date"]:not([disabled])',
        ].join(',')
      )
    ).filter(canClick);

  const findTimeOptions = () =>
    Array.from(
      document.querySelectorAll(
        [
          'button[data-time]:not([disabled])',
          '.time-slot:not(.disabled)',
          '.timeslot:not(.disabled)',
          'input[name*="Time"]:not([disabled])',
          'input[id*="Time"]:not([disabled])',
          'select[name*="Time"] option:not([disabled])',
        ].join(',')
      )
    ).filter(canClick);

  const findSubmitButton = () => {
    const candidates = Array.from(
      document.querySelectorAll('button[type="submit"], input[type="submit"], button, input[type="button"]')
    ).filter(canClick);

    const byText = candidates.find((el) => {
      const value = (el.innerText || el.value || '').trim().toLowerCase();
      return ['submit', 'book', 'continue', 'confirm', 'next', 'proceed'].some((token) => value.includes(token));
    });

    return byText || candidates[0] || null;
  };

  const selectRandomOption = (options) => {
    const pick = randomItem(options);
    if (!pick) return null;

    if (pick.tagName === 'OPTION' && pick.parentElement) {
      pick.parentElement.value = pick.value;
      pick.parentElement.dispatchEvent(new Event('change', { bubbles: true }));
      return pick.parentElement;
    }

    if (pick.tagName === 'INPUT' && (pick.type === 'radio' || pick.type === 'checkbox')) {
      pick.checked = true;
      pick.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      clickElement(pick);
    }

    return pick;
  };

  const run = async () => {
    if (sessionStorage.getItem('tm_slot_randomizer_done') === '1') return;

    const dateOptions = await waitFor(findDateOptions, MAX_WAIT_MS);
    if (!dateOptions.length) return;
    selectRandomOption(dateOptions);

    await sleep(STEP_DELAY_MS);

    const timeOptions = await waitFor(findTimeOptions, MAX_WAIT_MS);
    if (!timeOptions.length) return;
    selectRandomOption(timeOptions);

    await sleep(STEP_DELAY_MS);

    const submitButton = findSubmitButton();
    if (!submitButton) return;

    sessionStorage.setItem('tm_slot_randomizer_done', '1');
    clickElement(submitButton);
  };

  run().catch(() => {});
})();
