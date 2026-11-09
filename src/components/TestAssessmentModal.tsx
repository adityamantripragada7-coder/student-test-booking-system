import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Sloka } from '../types';
import { Modal } from './Modal';
import { BookOpen, CheckCircle2, AlertCircle, HelpCircle, Award, Sparkles, Send } from 'lucide-react';

interface TestAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId?: string;
  syllabus: string;
  onSuccess: (resultData: any) => void;
}

export const TestAssessmentModal: React.FC<TestAssessmentModalProps> = ({
  isOpen,
  onClose,
  bookingId,
  syllabus,
  onSuccess,
}) => {
  const [slokas, setSlokas] = useState<Sloka[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAnswers, setSelectedAnswers] = useState<{ [questionId: string]: number }>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    setError('');
    setSelectedAnswers({});
    setSubmitError('');

    const targetSyllabus = syllabus || '1-5';
    api
      .get(`/slokas?syllabus=${encodeURIComponent(targetSyllabus)}`)
      .then((res) => {
        if (res.success && res.slokas && res.slokas.length > 0) {
          setSlokas(res.slokas);
        } else {
          // If no specific syllabus slokas found, load all available active slokas
          api.get('/slokas').then((allRes) => {
            if (allRes.success && allRes.slokas && allRes.slokas.length > 0) {
              setSlokas(allRes.slokas);
            } else {
              setError(`No questions currently available for syllabus "${targetSyllabus}".`);
            }
          });
        }
      })
      .catch(() => setError('Failed to load assessment test questions.'))
      .finally(() => setLoading(false));
  }, [isOpen, syllabus]);

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  // Collect all questions across loaded slokas
  const allQuestions = slokas.flatMap((sloka) =>
    sloka.questions.map((q) => ({
      ...q,
      slokaTitle: sloka.title,
      slokaSanskrit: sloka.sanskritText,
      slokaMeaning: sloka.englishMeaning,
      slokaId: sloka._id,
    }))
  );

  const answeredCount = Object.keys(selectedAnswers).length;
  const totalCount = allQuestions.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (totalCount === 0) {
      setSubmitError('No questions to submit.');
      return;
    }

    if (answeredCount < totalCount) {
      setSubmitError(`Please answer all ${totalCount} questions before submitting (currently answered ${answeredCount}/${totalCount}).`);
      return;
    }

    const submissions = Object.entries(selectedAnswers).map(([questionId, selectedOptionIndex]) => ({
      questionId,
      selectedOptionIndex,
    }));

    setSubmitting(true);
    try {
      const res = await api.post('/answers/submit', {
        bookingId,
        syllabus: syllabus || 'General Syllabus',
        testName: `Assessment: ${syllabus || 'Foundation Test'}`,
        submissions,
      });

      if (res.success) {
        onSuccess(res);
        onClose();
      } else {
        setSubmitError(res.message || 'Submission failed. Please try again.');
      }
    } catch (err: any) {
      setSubmitError('Server connection error submitting answers.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Test Assessment: Syllabus ${syllabus}`} maxWidth="xl">
      <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
        {loading ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Loading Slokas and Examination Questions...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{error}</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Header / Instructions */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 text-slate-700">
                <BookOpen className="w-4 h-4 text-brand-600" />
                <span>Read the slokas and select the correct option for each question.</span>
              </div>
              <span className="font-semibold text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-1 rounded-md">
                Answered: {answeredCount} / {totalCount}
              </span>
            </div>

            {/* Slokas and Questions */}
            {slokas.map((sloka, sIdx) => (
              <div key={sloka._id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                {/* Sloka Header */}
                <div className="border-b border-slate-100 pb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-brand-600 uppercase tracking-wider bg-brand-50 px-2 py-0.5 rounded">
                      Section {sIdx + 1} • Chapter {sloka.chapter}, Verse {sloka.slokaNumber}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">{sloka.title}</span>
                  </div>

                  {/* Sanskrit Verses */}
                  <div className="mt-3 p-3 bg-amber-50/50 border border-amber-200/60 rounded-xl text-center space-y-1">
                    <p className="text-base font-medium text-amber-950 font-serif whitespace-pre-line leading-relaxed">
                      {sloka.sanskritText}
                    </p>
                    {sloka.transliteration && (
                      <p className="text-xs text-slate-600 italic font-mono pt-1">
                        {sloka.transliteration}
                      </p>
                    )}
                  </div>

                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                    <strong className="text-slate-800">English Meaning: </strong>
                    {sloka.englishMeaning}
                  </p>
                </div>

                {/* Questions for this Sloka */}
                <div className="space-y-4 pt-1">
                  {sloka.questions.map((q: any, qIdx: number) => {
                    const qId = String(q._id);
                    const selected = selectedAnswers[qId];

                    return (
                      <div key={qId} className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
                        <div className="flex items-start space-x-2">
                          <span className="flex-shrink-0 w-5 h-5 bg-brand-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                            {qIdx + 1}
                          </span>
                          <p className="text-xs font-bold text-slate-900 leading-normal">
                            {q.questionText}
                          </p>
                        </div>

                        {/* Options */}
                        <div className="space-y-2 pl-7">
                          {q.options.map((opt: string, optIdx: number) => {
                            const isChosen = selected === optIdx;
                            return (
                              <label
                                key={optIdx}
                                onClick={() => handleSelectOption(qId, optIdx)}
                                className={`flex items-center space-x-3 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                                  isChosen
                                    ? 'bg-brand-50 border-brand-500 font-semibold text-brand-900 shadow-2xs'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`question_${qId}`}
                                  checked={isChosen}
                                  onChange={() => handleSelectOption(qId, optIdx)}
                                  className="h-3.5 w-3.5 text-brand-600 focus:ring-brand-500 border-slate-300"
                                />
                                <span className="flex-1">{opt}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {submitError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Submit Action */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting || totalCount === 0}
                className="inline-flex items-center space-x-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs disabled:opacity-50 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? 'Submitting Answers...' : 'Submit Test Answers'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
