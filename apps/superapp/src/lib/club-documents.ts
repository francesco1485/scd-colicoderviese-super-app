/** Official club documents attached to the registration form (config/scd-club-documents.v1.json). Read-only PDFs. */
import raw from "../../../../config/scd-club-documents.v1.json";

export interface ClubDocument { id: string; title: string; file: string; pages: number; audience: string }
const R = raw as unknown as { asOf: string; documents: ClubDocument[]; appRulesDerived: string[] };
export const CLUB_DOCUMENTS: ClubDocument[] = R.documents;
export const CLUB_DOCUMENTS_AS_OF = R.asOf;
export const APP_RULES_FROM_DOCUMENTS: string[] = R.appRulesDerived;
