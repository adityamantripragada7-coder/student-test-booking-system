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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Sloka Test Assessment: Syllabus ${syllabus}`}
      subtitle="Read the sacred slokas, study their meanings, and answer the multiple-choice questions below."
      maxWidth="3xl"
      footer={
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-600 font-medium">
            Progress:{' '}
            <strong className={answeredCount === totalCount && totalCount > 0 ? 'text-emerald-700 font-bold' : 'text-brand-700 font-bold'}>
              {answeredCount} / {totalCount} Questions Answered
            </strong>
          </div>

          <div className="flex items-center space-x-2.5 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || totalCount === 0 || answeredCount < totalCount}
              className={`inline-flex items-center justify-center space-x-2 px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all active:scale-98 ${
                submitting
                  ? 'bg-brand-400 text-white cursor-wait'
                  : answeredCount === totalCount && totalCount > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-lg focus:ring-4 focus:ring-emerald-500/20'
                  : 'bg-slate-100 text-slate-500 border border-slate-300 cursor-not-allowed'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {submitting
                  ? 'Submitting Answers...'
                  : answeredCount === totalCount && totalCount > 0
                  ? 'Submit Test Answers'
                  : `Answer All to Submit (${answeredCount}/${totalCount})`}
              </span>
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-9 h-9 border-3 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Loading Slokas and Examination Questions...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-center space-x-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>{error}</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header Instructions */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
              <div className="flex items-center space-x-2 text-slate-700 font-medium">
                <BookOpen className="w-4 h-4 text-brand-600 shrink-0" />
                <span>Read each verse carefully and select the single correct option.</span>
              </div>
              <span className="font-bold text-brand-700 bg-white border border-slate-200 px-3 py-1 rounded-xl shadow-2xs self-start sm:self-auto">
                Completed: {answeredCount} / {totalCount}
              </span>
            </div>

            {submitError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center space-x-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Slokas and Questions List */}
            {slokas.map((sloka, sIdx) => (
              <div key={sloka._id} className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
                {/* Sloka Header */}
                <div className="border-b border-slate-100 pb-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-brand-600 uppercase tracking-wider bg-brand-50 px-2.5 py-0.5 rounded-lg border border-brand-100">
                      Verse {sIdx + 1} • Chapter {sloka.chapter}, Verse {sloka.slokaNumber}
                    </span>
                    <span className="text-xs font-bold text-slate-700">{sloka.title}</span>
                  </div>

                  {/* Sanskrit Verses */}
                  <div className="p-4 bg-amber-50/60 border border-amber-200/70 rounded-2xl text-center space-y-1.5 shadow-2xs">
                    <p className="text-base sm:text-lg font-bold text-amber-950 font-serif whitespace-pre-line leading-relaxed tracking-wide">
                      {sloka.sanskritText}
                    </p>
                    {sloka.transliteration && (
                      <p className="text-xs text-slate-600 italic font-mono pt-1">
                        {sloka.transliteration}
                      </p>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed pt-1">
                    <strong className="text-slate-800">English Meaning: </strong>
                    {sloka.englishMeaning}
                  </p>
                </div>

                {/* Questions for this Sloka */}
                <div className="space-y-4">
                  {sloka.questions.map((q: any, qIdx: number) => {
                    const qId = String(q._id);
                    const selected = selectedAnswers[qId];

                    return (
                      <div key={qId} className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-3">
                        <div className="flex items-start space-x-2.5">
                          <span className="shrink-0 w-5 h-5 bg-brand-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5 shadow-2xs">
                            {qIdx + 1}
                          </span>
                          <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
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
                                className={`flex items-center space-x-3 p-3 rounded-xl border text-xs sm:text-sm cursor-pointer transition-all ${
                                  isChosen
                                    ? 'bg-brand-50 border-brand-600 font-bold text-brand-950 shadow-2xs ring-1 ring-brand-500/20'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50/80 hover:border-slate-300'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`question_${qId}`}
                                  checked={isChosen}
                                  onChange={() => handleSelectOption(qId, optIdx)}
                                  className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-slate-300"
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

            {/* Bottom Final Submission Card */}
            {totalCount > 0 && (
              <div className="p-6 bg-gradient-to-br from-slate-50 to-brand-50/40 border border-slate-200/90 rounded-3xl text-center space-y-4 shadow-sm">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900">End of Examination Verses</h4>
                  <p className="text-xs text-slate-500">
                    You have currently answered <strong className="font-bold text-slate-800">{answeredCount}</strong> of <strong className="font-bold text-slate-800">{totalCount}</strong> questions.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || answeredCount < totalCount}
                  className={`inline-flex items-center justify-center space-x-2 px-6 py-3 rounded-2xl text-xs sm:text-sm font-bold shadow-md transition-all active:scale-98 ${
                    submitting
                      ? 'bg-brand-400 text-white cursor-wait'
                      : answeredCount === totalCount && totalCount > 0
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-lg focus:ring-4 focus:ring-emerald-500/30'
                      : 'bg-amber-100 text-amber-900 border border-amber-300 cursor-not-allowed'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {submitting
                      ? 'Submitting Answers...'
                      : answeredCount === totalCount
                      ? 'Submit All Test Answers Now'
                      : `Answer All ${totalCount} Questions to Submit (${answeredCount}/${totalCount})`}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
