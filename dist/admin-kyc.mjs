import {escapeHTML as esc} from './transfer-ui.mjs';

const photoSlots = [
  ['document_front_path', 'Document front'],
  ['document_back_path', 'Document back'],
  ['selfie_path', 'Selfie']
];
const documentTypes = {passport:'Passport', national_id:'National ID', drivers_license:'Driver’s license'};

export async function loadKycPhotos(service, row) {
  const slots = photoSlots.filter(([key]) => key !== 'document_back_path' || row.document_type !== 'passport');
  const images = await Promise.all(slots.map(async ([key, label]) => {
    const url = await service.kycPhoto(row[key]);
    const image = new Image();
    image.alt = label;
    image.style.maxWidth = '100%';
    image.style.maxHeight = '60vh';
    image.referrerPolicy = 'no-referrer';
    image.src = url;
    await image.decode();
    return image;
  }));
  const gallery = document.createElement('div');
  for (const image of images) {
    const label = document.createElement('p');
    label.textContent = image.alt;
    gallery.append(label, image);
  }
  return gallery;
}

export function kycDetailsHTML(row) {
  return `<dl class="finance-facts">
    <dt>Legal name</dt><dd>${esc(row.full_name)}</dd>
    <dt>Date of birth</dt><dd>${esc(row.date_of_birth)}</dd>
    <dt>Country of residence</dt><dd>${esc(row.country)}</dd>
    <dt>Document type</dt><dd>${esc(documentTypes[row.document_type])}</dd>
    <dt>Account ID</dt><dd>${esc(row.user_id)}</dd>
  </dl>`;
}

export const adminKycHTML = `
  <section class="deposit-panel finance-audit" id="admin-kyc">
    <div class="finance-section-heading">
      <h2>KYC review</h2>
      <button type="button" class="secondary-button" data-kyc-refresh>Refresh KYC</button>
    </div>
    <p class="transfer-caption" data-kyc-status role="status">Sign in as an administrator to review submissions.</p>
    <div data-kyc-queue></div>
    <div class="transfer-actions">
      <button type="button" class="transfer-back" data-kyc-prev disabled>Previous</button>
      <button type="button" class="transfer-back" data-kyc-next disabled>Next</button>
    </div>
    <dialog class="finance-dialog" aria-labelledby="admin-kyc-review-title">
      <div class="finance-section-heading">
        <h2 id="admin-kyc-review-title">Review identity submission</h2>
        <button type="button" class="transfer-back" data-kyc-close>Close</button>
      </div>
      <div data-kyc-details></div>
      <p class="deposit-error" data-kyc-error role="alert"></p>
      <button type="button" class="deposit-continue" data-kyc-approve disabled>Approve KYC</button>
    </dialog>
  </section>`;

export function mountAdminKyc(panel, service) {
  const q = selector => panel.querySelector(selector);
  const queue = q('[data-kyc-queue]');
  const status = q('[data-kyc-status]');
  const refresh = q('[data-kyc-refresh]');
  const previous = q('[data-kyc-prev]');
  const next = q('[data-kyc-next]');
  const dialog = q('dialog');
  let offset = 0;
  const details = q('[data-kyc-details]');
  const approve = q('[data-kyc-approve]');
  const error = q('[data-kyc-error]');
  let rows = [];
  let selected = null;
  let saving = false;
  let reviewVersion = 0;

  async function load(message = '') {
    refresh.disabled = previous.disabled = next.disabled = true;
    rows = [];
    queue.replaceChildren();
    status.textContent = 'Loading pending submissions…';
    try {
      const pending = await service.pendingKyc(offset);
      next.disabled = pending.length <= 25;
      rows = pending.slice(0,25);
      queue.innerHTML = rows.map((row, index) => `
        <article class="finance-request">
          <div class="finance-section-heading">
            <strong>${esc(row.full_name)}</strong>
            <button type="button" class="secondary-button" data-kyc-review="${index}">Review</button>
          </div>
          <p class="transfer-caption">Submitted ${esc(new Date(row.consent_at).toLocaleString())}</p>
        </article>`).join('');
      const count = rows.length ? `Showing pending submissions ${offset + 1}–${offset + rows.length}.`
        : 'No pending KYC submissions on this page.';
      status.textContent = [message, count].filter(Boolean).join(' ');
    } catch (cause) {
      status.textContent = [message, 'Unable to load the KYC queue.', cause.message].filter(Boolean).join(' ');
    } finally {
      refresh.disabled = false;
      previous.disabled = offset === 0;
    }
  }

  async function open(row) {
    const version = ++reviewVersion;
    selected = null;
    approve.disabled = true;
    error.textContent = '';
    details.innerHTML = kycDetailsHTML(row) + '<p data-kyc-photos>Loading private photos…</p>';
    dialog.showModal();
    const photos = q('[data-kyc-photos]');
    try {
      const gallery = await loadKycPhotos(service, row);
      if (!dialog.open || version !== reviewVersion || !panel.isConnected) return;
      photos.replaceWith(gallery);
      selected = row;
      approve.disabled = false;
    } catch {
      if (dialog.open && version === reviewVersion) {
        photos.textContent = 'Unable to load all required photos. Close this review and try again.';
      }
    }
  }

  queue.onclick = event => {
    const button = event.target.closest('[data-kyc-review]');
    if (button) open(rows[Number(button.dataset.kycReview)]);
  };
  refresh.onclick = () => { offset = 0; load(); };
  previous.onclick = () => { offset -= 25; load(); };
  next.onclick = () => { offset += 25; load(); };
  q('[data-kyc-close]').onclick = () => { if (!saving) dialog.close(); };
  dialog.addEventListener('cancel', event => { if (saving) event.preventDefault(); });
  dialog.addEventListener('close', () => {
    if (dialog.open) return;
    selected = null;
    details.replaceChildren();
  });
  approve.onclick = async () => {
    if (!selected || saving) return;
    saving = approve.disabled = true;
    error.textContent = '';
    try {
      await service.approveKyc(selected);
      dialog.close();
      offset = 0;
      await load('KYC approved.');
    } catch (cause) {
      error.textContent = cause.message;
    } finally {
      saving = false;
      approve.disabled = !dialog.open;
    }
  };
  return load();
}
