import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  analysisResult: null,
  editedData: {},
  saved: false
};

const analysisSlice = createSlice({
  name: "analysis",
  initialState,

  reducers: {
    setAnalysisResult: (state, action) => {
      state.analysisResult = action.payload;
      state.editedData = {
        ...(action.payload?.extracted_data || {})
      };
      state.saved = false;
    },

    updateField: (state, action) => {
      const { field, value } = action.payload;
      state.editedData[field] = value;
      state.saved = false;
    },

    updateReview: (state, action) => {
      if (state.analysisResult) {
        state.analysisResult.review = action.payload.review;
        state.analysisResult.audit = action.payload.audit;
      }
    },

    markSaved: (state) => {
      state.saved = true;
    },

    resetAnalysis: (state) => {
      state.analysisResult = null;
      state.editedData = {};
      state.saved = false;
    }
  }
});

export const {
  setAnalysisResult,
  updateField,
  updateReview,
  markSaved,
  resetAnalysis
} = analysisSlice.actions;

export default analysisSlice.reducer;