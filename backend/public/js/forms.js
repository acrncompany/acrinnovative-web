/*
 * forms.js: sends the contact and job-application forms in the background (no page reload) and shows the result
 * on the page. The forms also work WITHOUT this script (normal post + the page is shown again), so this only improves them.
 *
 * Any <form data-enhance> is handled. The server answers JSON when we ask for it (Accept: application/json):
 *   { ok: true, message }                              success
 *   { ok: false, message, errors: { field: text } }    problems next to fields
 *   { ok: false, message }                             rate limit, file too large, ...
 */
(function () {
  'use strict';

  function statusBox(form) {
    return form.querySelector('.form-status');
  }

  function show(form, kind, text) {
    var box = statusBox(form);
    if (!box) return;
    box.textContent = '';
    if (!text) return;
    var alert = document.createElement('div');
    alert.className = 'uk-alert uk-alert-' + (kind === 'ok' ? 'success' : 'danger');
    var p = document.createElement('p');
    p.textContent = text; // textContent: never HTML from the server
    alert.appendChild(p);
    box.appendChild(alert);
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
    box.focus({ preventScroll: true });
  }

  function clearErrors(form) {
    form.querySelectorAll('.field-error').forEach(function (e) { e.textContent = ''; });
    form.querySelectorAll('.uk-form-danger').forEach(function (e) { e.classList.remove('uk-form-danger'); e.removeAttribute('aria-invalid'); });
  }

  function showErrors(form, errors) {
    var first = null;
    Object.keys(errors || {}).forEach(function (name) {
      var input = form.elements[name];
      var slot = form.querySelector('[data-error-for="' + name + '"]');
      if (slot) slot.textContent = errors[name];
      if (input && input.classList) {
        input.classList.add('uk-form-danger');
        input.setAttribute('aria-invalid', 'true');
        first = first || input;
      }
    });
    if (first) first.focus({ preventScroll: true });
  }

  function enhance(form) {
    var button = form.querySelector('button[type="submit"]');
    var idle = button ? button.textContent : '';

    // Quick check of the CV before uploading anything.
    var file = form.querySelector('input[type="file"]');
    if (file) {
      file.addEventListener('change', function () {
        var slot = form.querySelector('[data-error-for="cv"]');
        var f = file.files && file.files[0];
        var max = parseInt(file.getAttribute('data-max-bytes') || '0', 10);
        if (slot) slot.textContent = f && max && f.size > max ? 'That file is larger than 5 MB. Please choose a smaller one.' : '';
      });
    }

    form.addEventListener('submit', function (event) {
      if (!window.fetch || !window.FormData) return; // very old browser: let the normal form post happen
      event.preventDefault();
      clearErrors(form);
      show(form, 'ok', '');

      var data = new FormData(form);
      var multipart = (form.getAttribute('enctype') || '').indexOf('multipart') === 0;
      var body = multipart ? data : new URLSearchParams(data);

      if (button) {
        button.disabled = true;
        button.textContent = form.getAttribute('data-sending') || 'Sending…';
      }

      fetch(form.getAttribute('action'), { method: 'POST', body: body, headers: { Accept: 'application/json' }, credentials: 'same-origin' })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (json) { return { res: res, json: json }; });
        })
        .then(function (r) {
          if (r.res.ok && r.json.ok) {
            form.reset();
            show(form, 'ok', r.json.message || 'Thank you! We have received your submission.');
          } else {
            showErrors(form, r.json.errors);
            show(form, 'error', r.json.message || 'Sorry, we could not send that. Please try again.');
          }
        })
        .catch(function () {
          show(form, 'error', 'We could not reach the server. Please check your internet connection and try again.');
        })
        .then(function () {
          if (button) {
            button.disabled = false;
            button.textContent = idle;
          }
        });
    });
  }

  document.querySelectorAll('form[data-enhance]').forEach(enhance);
})();
