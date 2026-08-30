import { PDFDocument } from 'pdf-lib'

/**
 * Fills the real, official ICS-213 (General Message) AcroForm PDF - not a layout we drew
 * ourselves. `src/assets/forms/ics-213.pdf` is FEMA's own fillable copy (a US government
 * work, public domain), downloaded and inspected field-by-field with `pypdf` before this was
 * written (E-31/E-41 phase 3 scoping, 2026-08-26) rather than guessed - the 15 field names
 * below are exact, not approximated.
 *
 * D-42-style split deliberately kept: this module is PURE (no HTTP, no DOM, no Angular DI) -
 * it takes template bytes and fills them, and never decides where the bytes come from. A
 * caller `fetch()`s `assets/forms/ics-213.pdf` and hands the result here; that keeps this
 * testable with the real template with no Karma/HttpClient machinery inside the function
 * itself, same reasoning as `ranger-migration.ts`'s own "pure, no injection" split.
 *
 * The 213's REPLY block (fields 9/10, plus both signature fields) is deliberately never
 * filled by this function - a reply is written by the actual recipient, by hand, after the
 * fact. Filling it here would be inventing data nobody has entered, the same trap D-42's
 * `normalizeRangerIds()` refuses for a credential number.
 */

/** Every fillable text field on the real form, exactly as named in the PDF's own AcroForm. */
export const ICS213_FIELDS = [
  '1 Incident Name Optional',
  '2 To Name and Position',
  '3 From Name and Position',
  '4 Subject',
  '5 Date',
  '6 Time',
  '7 Message',
  '8 Approved by Name',
] as const

export type Ics213FieldName = typeof ICS213_FIELDS[number]

/** Values to fill in. Any field left out of `fields` stays blank on the printed form. */
export type Ics213FieldValues = Partial<Record<Ics213FieldName, string>>

/**
 * Returns the filled PDF's bytes. `flatten` (default true) burns the field values into the
 * page content so the result prints identically everywhere, including a browser's own PDF
 * viewer/print pipeline that may not render live AcroForm widgets - pass false only if a
 * caller genuinely wants the recipient able to keep editing the fields (e.g. to hand-fill the
 * Reply block after receiving it).
 */
export async function fillIcs213Pdf(
  templateBytes: Uint8Array,
  fields: Ics213FieldValues,
  flatten = true,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(templateBytes)
  const form = pdf.getForm()

  for (const [name, value] of Object.entries(fields)) {
    if (value === undefined) continue
    form.getTextField(name).setText(value)
  }

  if (flatten) {
    form.flatten()
  }

  // The bundled template is FEMA's own 2-page distribution: page 1 is the actual form, page
  // 2 is a sample/instructions page that ships with every official copy. A printed 213
  // should be the filled form alone - remove pages after the first rather than trusting the
  // template to stay exactly 2 pages forever (a future template swap that's already
  // single-page would make index 1 out of range).
  for (let i = pdf.getPageCount() - 1; i >= 1; i--) {
    pdf.removePage(i)
  }

  return pdf.save()
}
