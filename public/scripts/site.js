(() => {
  'use strict';

  const emit = (name, context = {}) => {
    window.dispatchEvent(
      new CustomEvent('impact-sol:event', {
        detail: {
          name,
          context: { path: window.location.pathname, ...context },
        },
      }),
    );
  };

  const mobileMenu = document.querySelector('.mobile-nav');
  if (mobileMenu instanceof HTMLDetailsElement) {
    mobileMenu.addEventListener('toggle', () => {
      const summary = mobileMenu.querySelector('summary');
      summary?.setAttribute(
        'aria-label',
        mobileMenu.open ? 'Close navigation' : 'Open navigation',
      );
    });

    mobileMenu.addEventListener('click', (event) => {
      if (event.target instanceof HTMLAnchorElement) mobileMenu.open = false;
    });

    mobileMenu.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        mobileMenu.open = false;
        mobileMenu.querySelector('summary')?.focus();
      }
    });
  }

  document.addEventListener('click', (event) => {
    const link = event.target instanceof Element ? event.target.closest('a') : null;
    if (!(link instanceof HTMLAnchorElement)) return;

    const destination = new URL(link.href, window.location.href).pathname;
    if (link.closest('nav')) {
      emit('navigation_select', {
        destination,
        placement: link.closest('.site-footer') ? 'footer' : 'header',
      });
    } else if (link.dataset.event) {
      emit('cta_select', {
        ctaId: link.dataset.event,
        placement: link.dataset.placement || 'unspecified',
        destination,
      });
    }
  });

  for (const details of document.querySelectorAll('.faq-list details')) {
    details.addEventListener('toggle', () => {
      const summary = details.querySelector('summary');
      const siblings = details.parentElement ? [...details.parentElement.children] : [];
      const position = siblings.indexOf(details);
      const faqId = summary?.id || `faq-${position >= 0 ? position + 1 : 'unknown'}`;
      emit('faq_toggle', { faqId, state: details.open ? 'open' : 'closed' });
    });
  }

  if (document.body.dataset.pageState) {
    emit('error_view', { errorType: document.body.dataset.pageState });
  }

  const constraints = {
    name: { min: 2, max: 100, label: 'Name' },
    email: { min: 5, max: 254, label: 'Email' },
    message: { min: 20, max: 3000, label: 'Message' },
    organization: { max: 160, label: 'Organisation' },
    phone: { max: 32, label: 'Phone' },
    country: { max: 80, label: 'Country' },
    websiteUrl: { max: 300, label: 'Website' },
    role: { max: 100, label: 'Role or organisation type' },
    subject: { max: 140, label: 'Inquiry category' },
    partnershipInterest: { max: 300, label: 'Proposed collaboration' },
    initiativeName: { max: 160, label: 'Business or initiative name' },
    supportNeeded: { max: 500, label: 'Support needed' },
  };

  const findOrCreateError = (form, field) => {
    const errorId = `${field.id || field.name}-error`;
    let error = form.querySelector(`#${CSS.escape(errorId)}`);

    if (!(error instanceof HTMLElement)) {
      error = document.createElement('span');
      error.id = errorId;
      error.className = 'field-error';
      error.hidden = true;
      field.insertAdjacentElement('afterend', error);
    }

    const describedBy = new Set(
      (field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean),
    );
    describedBy.add(errorId);
    field.setAttribute('aria-describedby', [...describedBy].join(' '));
    return error;
  };

  const setFieldError = (form, field, message) => {
    const error = findOrCreateError(form, field);
    error.textContent = message;
    error.hidden = !message;
    field.setAttribute('aria-invalid', message ? 'true' : 'false');
  };

  const validateField = (form, field) => {
    if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement)) {
      return true;
    }

    const value = field.value.trim();
    const rule = constraints[field.name];
    let message = '';

    if (field.required && field instanceof HTMLInputElement && field.type === 'checkbox' && !field.checked) {
      message = 'Please confirm before sending.';
    } else if (field.required && !value) {
      message = `${rule?.label || 'This field'} is required.`;
    } else if (value && rule?.min && value.length < rule.min) {
      message = `${rule.label} must be at least ${rule.min} characters.`;
    } else if (value && rule?.max && value.length > rule.max) {
      message = `${rule.label} must be ${rule.max} characters or fewer.`;
    } else if (field.name === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      message = 'Enter an email address in the format name@example.com.';
    } else if (field.name === 'websiteUrl' && value) {
      try {
        const parsed = new URL(value);
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('protocol');
      } catch {
        message = 'Enter a complete website address beginning with http:// or https://.';
      }
    }

    setFieldError(form, field, message);
    return !message;
  };

  const statusElement = (form) => {
    let status = form.querySelector('[data-form-status], .form-status');
    if (!(status instanceof HTMLElement)) {
      status = document.createElement('p');
      status.className = 'form-status';
      status.dataset.formStatus = '';
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      form.append(status);
    }
    return status;
  };

  const setStatus = (form, message, state = '') => {
    const status = statusElement(form);
    status.textContent = message;
    status.dataset.state = state;
  };

  for (const form of document.querySelectorAll('form[data-inquiry-form]')) {
    form.noValidate = true;
    let started = false;
    let completed = false;

    form.addEventListener(
      'input',
      () => {
        if (started) return;
        started = true;
        emit('form_start', { form: form.dataset.inquiryForm || 'inquiry' });
      },
      { once: true },
    );

    window.addEventListener('pagehide', () => {
      if (started && !completed) {
        emit('form_submit_result', {
          form: form.dataset.inquiryForm || 'inquiry',
          result: 'abandoned',
        });
      }
    });

    const sourceField = form.elements.namedItem('sourcePath');
    if (sourceField instanceof HTMLInputElement) sourceField.value = window.location.pathname;

    for (const field of form.elements) {
      if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement)) continue;
      field.addEventListener('blur', () => validateField(form, field));
      field.addEventListener('input', () => {
        if (field.getAttribute('aria-invalid') === 'true') validateField(form, field);
      });
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const fields = [...form.elements].filter(
        (field) =>
          field instanceof HTMLInputElement ||
          field instanceof HTMLTextAreaElement ||
          field instanceof HTMLSelectElement,
      );
      const isValid = fields.map((field) => validateField(form, field)).every(Boolean);

      if (!isValid) {
        setStatus(form, 'Please review the highlighted fields.', 'error');
        fields.find((field) => field.getAttribute('aria-invalid') === 'true')?.focus();
        emit('form_submit_result', {
          form: form.dataset.inquiryForm || 'inquiry',
          result: 'validation',
        });
        return;
      }

      const submit = form.querySelector('[type="submit"]');
      // The label stays in place so the control keeps its width; the spinner
      // and aria-busy carry the pending state instead of a text swap.
      if (submit instanceof HTMLButtonElement) {
        submit.disabled = true;
        submit.dataset.loading = 'true';
        submit.setAttribute('aria-busy', 'true');
      }
      setStatus(form, 'Sending your message…');

      try {
        const payload = new URLSearchParams();
        const formData = new FormData(form);
        for (const [key, value] of formData.entries()) {
          if (typeof value === 'string') payload.append(key, value);
        }

        const response = await fetch('/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          },
          body: payload.toString(),
          credentials: 'same-origin',
        });

        if (!response.ok) {
          throw new Error('submission_failed');
        }

        form.reset();
        completed = true;
        if (sourceField instanceof HTMLInputElement) sourceField.value = window.location.pathname;
        setStatus(
          form,
          'Thank you. Your enquiry has been received for review.',
          'success',
        );
        emit('form_submit_result', {
          form: form.dataset.inquiryForm || 'inquiry',
          result: 'success',
        });
      } catch {
        setStatus(
          form,
          'We could not send this form right now. Please use the email option on this page.',
          'error',
        );
        emit('form_submit_result', {
          form: form.dataset.inquiryForm || 'inquiry',
          result: 'server',
        });
      } finally {
        if (submit instanceof HTMLButtonElement) {
          submit.disabled = false;
          delete submit.dataset.loading;
          submit.removeAttribute('aria-busy');
        }
      }
    });
  }
})();
