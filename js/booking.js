// Diamonds Cleaning Services — booking / instant quote engine
document.addEventListener('DOMContentLoaded', () => {

  const PRICING = {
    regular:  { label: 'Regular cleaning',        base: 22, perBedroom: 8,  note: 'per visit' },
    oneoff:   { label: 'One-off cleaning',         base: 45, perBedroom: 14, note: 'one-time' },
    eot:      { label: 'End of tenancy cleaning',  base: 89, perBedroom: 22, note: 'fixed price' },
    carpet:   { label: 'Carpet cleaning',          base: 15, perBedroom: 15, note: 'per room' }
  };
  const FREQUENCY_DISCOUNT = { weekly: 0.85, fortnightly: 0.92, monthly: 1, once: 1 };
  const EXTRAS = {
    oven: { label: 'Inside the oven', price: 15 },
    fridge: { label: 'Inside the fridge', price: 10 },
    ironing: { label: 'Ironing (up to 1hr)', price: 12 },
    windows: { label: 'Interior windows', price: 10 }
  };

  const form = document.getElementById('booking-form');
  if (!form) return;

  const serviceChips = document.querySelectorAll('input[name="service"]');
  const bedroomSelect = document.getElementById('bedrooms');
  const frequencyField = document.getElementById('frequency-field');
  const frequencySelect = document.getElementById('frequency');
  const extraChips = document.querySelectorAll('input[name="extras"]');
  const quotePrice = document.getElementById('quote-price');
  const quoteLines = document.getElementById('quote-lines');
  const dateInput = document.getElementById('preferred-date');
  const calendarWrap = document.getElementById('calendar');

  // Preselect service from ?service= query param (linked from service pages)
  const params = new URLSearchParams(window.location.search);
  const preselect = params.get('service');
  if (preselect && document.getElementById('service-' + preselect)) {
    document.getElementById('service-' + preselect).checked = true;
  }

  function currentService() {
    const checked = document.querySelector('input[name="service"]:checked');
    return checked ? checked.value : 'regular';
  }

  function calculate() {
    const svc = PRICING[currentService()];
    const bedrooms = parseInt(bedroomSelect.value || '1', 10);
    let subtotal = svc.base + (svc.perBedroom * bedrooms);

    let discountLabel = null;
    if (currentService() === 'regular') {
      frequencyField.style.display = 'block';
      const freq = frequencySelect.value;
      const mult = FREQUENCY_DISCOUNT[freq] ?? 1;
      if (mult < 1) discountLabel = `${Math.round((1 - mult) * 100)}% recurring discount`;
      subtotal = subtotal * mult;
    } else {
      frequencyField.style.display = 'none';
    }

    let extrasTotal = 0;
    const extraLines = [];
    extraChips.forEach(chip => {
      if (chip.checked) {
        extrasTotal += EXTRAS[chip.value].price;
        extraLines.push(`${EXTRAS[chip.value].label} — £${EXTRAS[chip.value].price}`);
      }
    });

    const total = Math.round((subtotal + extrasTotal) * 100) / 100;

    quotePrice.textContent = `£${total.toFixed(2)}`;
    quoteLines.innerHTML = `
      <div class="quote-line"><span>${svc.label} (${bedrooms} bed)</span><span>£${subtotal.toFixed(2)}</span></div>
      ${discountLabel ? `<div class="quote-line"><span>${discountLabel}</span><span>included</span></div>` : ''}
      ${extraLines.map(l => `<div class="quote-line"><span>${l.split(' — ')[0]}</span><span>${l.split(' — ')[1]}</span></div>`).join('')}
      <div class="quote-line"><span>Basis</span><span>${svc.note}</span></div>
    `;
  }

  serviceChips.forEach(c => c.addEventListener('change', () => {
    document.querySelectorAll('.chip').forEach(l => l.classList.remove('checked'));
    if (c.checked) c.closest('.chip').classList.add('checked');
    window.trackEvent && window.trackEvent('quote_service_selected', { service: c.value });
    calculate();
  }));
  extraChips.forEach(c => c.addEventListener('change', () => {
    c.closest('.chip').classList.toggle('checked', c.checked);
    calculate();
  }));
  bedroomSelect.addEventListener('change', calculate);
  frequencySelect.addEventListener('change', calculate);

  // Mark initial chip state
  document.querySelectorAll('input[name="service"]:checked, input[name="extras"]:checked').forEach(c => {
    c.closest('.chip')?.classList.add('checked');
  });

  calculate();

  // --- Simple calendar widget -------------------------------------------------
  function buildCalendar() {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1); // earliest tomorrow
    let html = '<div class="cal-grid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;">';
    const dayNames = ['S','M','T','W','T','F','S'];
    dayNames.forEach(d => html += `<div style="text-align:center;font-size:.7rem;color:var(--ink-soft);font-weight:600;">${d}</div>`);

    const firstOfMonth = new Date(start.getFullYear(), start.getMonth(), 1);
    const lead = firstOfMonth.getDay();
    for (let i = 0; i < lead; i++) html += '<div></div>';

    const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(start.getFullYear(), start.getMonth(), d);
      const iso = date.toISOString().slice(0, 10);
      const isPast = date < start;
      const isSunday = date.getDay() === 0; // closed Sundays
      const disabled = isPast || isSunday;
      html += `<button type="button" data-date="${iso}" ${disabled ? 'disabled' : ''}
        style="padding:.5em 0;font-size:.82rem;border:1px solid var(--line);border-radius:4px;
        background:${disabled ? '#EFEFEA' : 'var(--white)'};color:${disabled ? '#B7B7AC' : 'var(--ink)'};
        cursor:${disabled ? 'not-allowed' : 'pointer'};">${d}</button>`;
    }
    html += '</div>';
    calendarWrap.innerHTML = html;

    calendarWrap.querySelectorAll('button[data-date]').forEach(btn => {
      btn.addEventListener('click', () => {
        calendarWrap.querySelectorAll('button').forEach(b => b.style.outline = 'none');
        btn.style.outline = `3px solid var(--gold)`;
        dateInput.value = btn.dataset.date;
        clearFieldError(dateInput);
        window.trackEvent && window.trackEvent('quote_date_selected', { date: btn.dataset.date });
      });
    });
  }
  if (calendarWrap) buildCalendar();

  // --- Validation ---------------------------------------------------------
  function setFieldError(input, message) {
    const field = input.closest('.field');
    if (!field) return;
    field.classList.add('invalid');
    const small = field.querySelector('small.error');
    if (small) small.textContent = message;
  }
  function clearFieldError(input) {
    const field = input.closest('.field');
    if (!field) return;
    field.classList.remove('invalid');
  }

  const postcodeRe = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let valid = true;

    const name = document.getElementById('full-name');
    if (!name.value.trim()) { setFieldError(name, 'Enter your full name.'); valid = false; } else clearFieldError(name);

    const email = document.getElementById('email');
    if (!emailRe.test(email.value.trim())) { setFieldError(email, 'Enter a valid email address.'); valid = false; } else clearFieldError(email);

    const phone = document.getElementById('phone');
    if (phone.value.replace(/\D/g,'').length < 10) { setFieldError(phone, 'Enter a valid UK phone number.'); valid = false; } else clearFieldError(phone);

    const postcode = document.getElementById('postcode');
    if (!postcodeRe.test(postcode.value.trim())) { setFieldError(postcode, 'Enter a valid UK postcode.'); valid = false; } else clearFieldError(postcode);

    if (!dateInput.value) {
      window.trackEvent && window.trackEvent('booking_dropoff', { step: 'date_selection' });
      calendarWrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
      valid = false;
    }

    if (!valid) {
      window.trackEvent && window.trackEvent('booking_form_invalid', {});
      return;
    }

    const booking = {
      reference: 'DCS-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
      service: PRICING[currentService()].label,
      bedrooms: bedroomSelect.value,
      date: dateInput.value,
      total: quotePrice.textContent,
      name: name.value.trim(),
      email: email.value.trim(),
      postcode: postcode.value.trim().toUpperCase(),
      submittedAt: new Date().toISOString()
    };
    const bookings = JSON.parse(localStorage.getItem('dcs_bookings') || '[]');
    bookings.push(booking);
    localStorage.setItem('dcs_bookings', JSON.stringify(bookings));
    window.trackEvent && window.trackEvent('booking_submitted', booking);

    document.getElementById('booking-layout').style.display = 'none';
    const confirm = document.getElementById('confirm-box');
    confirm.classList.add('show');
    confirm.querySelector('.ref').textContent = booking.reference;
    confirm.querySelector('.confirm-price').textContent = booking.total;
    confirm.querySelector('.confirm-date').textContent = new Date(booking.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  });
});
