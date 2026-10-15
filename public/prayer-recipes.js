import {group,ref} from './block-engine.js';
// A recipe contains references to reusable groups, never page ranges or image cuts.
// Only Shacharit is present in the current source (printed pages 1-250).
export const prayerRecipes={
  shacharit:group('shacharit','שחרית',[
    ref('birchot-hashachar'),ref('morning-preparation'),ref('shacharit-opening'),
    ref('after-amidah'),ref('tachanun-section'),ref('torah-service'),
    ref('torah-blessings-kaddish'),ref('shacharit-ending')
  ])
};
