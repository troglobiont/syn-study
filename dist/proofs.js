import {FIRST_YEAR_PROOFS} from './proofs-first-year.js';
import {SECOND_YEAR_PROOFS} from './proofs-second-year.js';
export const PROOFS=[...FIRST_YEAR_PROOFS,...SECOND_YEAR_PROOFS];
export const PROOF_BY_ID=Object.fromEntries(PROOFS.map(p=>[p.id,p]));
