/** The trained model the site uses. Regenerate with `npm run calibrate`. */
import model from "./model.json";
import type { ModelWeights } from "./model";

export const SHIPPED_MODEL = model;
export const SHIPPED_WEIGHTS: ModelWeights = model.weights;
