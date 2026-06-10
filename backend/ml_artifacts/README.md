# This directory holds the trained scikit-learn pipeline artifact.
#
# To populate it (Phase 3):
# 1. Run the Jupyter notebook: ml/notebooks/03_churn_prediction.ipynb
# 2. At the end of that notebook, add:
#
#       import joblib
#       joblib.dump(pipeline, "../backend/ml_artifacts/loyalty_model.joblib")
#
# The .joblib file is git-ignored (see backend/.gitignore).
# It must be present on the server before the Phase 3 inference route activates.
