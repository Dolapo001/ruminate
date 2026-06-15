import { AppNav } from "@/components/AppNav";
import { ModelComparison, FeatureImportance, ConfusionMatrix } from "@/components/model";
import { getMetrics } from "@/lib/data";

export default async function ModelPage() {
  const m = await getMetrics();
  return (
    <>
      <AppNav />
      <div className="page">
        <div className="pagehead">
          <div>
            <h1>Model &amp; evaluation</h1>
            <div className="date">
              WHY YOU CAN TRUST THE ALERTS · {m.cv_folds ?? 5}-FOLD CV · LSTM + XGBOOST + NN + TREE
            </div>
          </div>
          <span className="pill pill-gold">XGBoost + SHAP</span>
        </div>
        <div className="model-grid">
          <ModelComparison cv={m.cv ?? []} folds={m.cv_folds ?? 5} />
          <FeatureImportance items={m.feature_importance} />
          <ConfusionMatrix classes={m.classes} matrix={m.confusion_matrix} />
          <div className="mcard panel">
            <h3>Reading the herd, not memorising it</h3>
            <p className="note">
              The test set is split <span className="gold">by animal</span>, so no cow appears in both
              training and testing — the scores reflect generalisation to new animals, not memorised
              individuals.
            </p>
            <p className="note">
              Labels carry a small amount of noise to mimic imperfect vet records, which is why
              accuracy lands at a realistic <span className="gold">~95%</span> rather than a suspicious
              100%. Rare health events (At Risk) are the hardest to catch — exactly where a vet&apos;s
              confirmation in the app feeds back as new training data.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
