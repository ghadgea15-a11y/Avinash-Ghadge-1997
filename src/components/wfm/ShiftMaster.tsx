import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, Clock, Calendar, CheckCircle2, XCircle, Search } from 'lucide-react';
import { UserSession, CompanyTenant, ShiftRecord } from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { motion, AnimatePresence } from 'motion/react';
import { useFeedback } from '../../context/ActionFeedbackContext';

interface Props {
  userSession: UserSession;
  activeCompany: CompanyTenant;
}

export const ShiftMaster: React.FC<Props> = ({ userSession, activeCompany }) => {
  const { showSuccess, showError, showLoading, showCancelled, showValidationFailed, handleError, confirm } = useFeedback();
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState<Partial<ShiftRecord>>({
    shiftName: '',
    shiftCode: '',
    startTime: '09:00',
    endTime: '18:00',
    gracePeriodMinutes: 15,
    breakDurationMinutes: 60,
    minWorkMinutes: 480,
    status: 'ACTIVE',
    weeklyOffDays: [0], // Sunday
  });

  useEffect(() => {
    const unsub = FirestoreService.subscribeToShifts(userSession, activeCompany.companyId, (data) => {
      setShifts(data);
      setIsLoading(false);
    });
    return () => unsub();
  }, [activeCompany.companyId, userSession]);

  const handleOpenModal = (shift?: ShiftRecord) => {
    if (shift) {
      setEditingShift(shift);
      setForm(shift);
    } else {
      setEditingShift(null);
      setForm({
        shiftName: '',
        shiftCode: `SH-${Math.floor(100 + Math.random() * 900)}`,
        startTime: '09:00',
        endTime: '18:00',
        gracePeriodMinutes: 15,
        breakDurationMinutes: 60,
        minWorkMinutes: 480,
        status: 'ACTIVE',
        weeklyOffDays: [0],
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    showCancelled('🚫 Shift configuration cancelled');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (!form.shiftName?.trim() || !form.shiftCode?.trim()) {
      showValidationFailed('Please provide both shift name and shift code.');
      return;
    }

    const shiftData: ShiftRecord = {
      ...(form as ShiftRecord),
      id: editingShift?.id || `SHIFT-${Date.now()}`,
      companyId: activeCompany.companyId,
      createdAt: editingShift?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: editingShift?.createdBy || userSession.userId,
      updatedBy: userSession.userId,
    };

    setIsSaving(true);
    const dismiss = showLoading(editingShift ? 'Updating shift...' : 'Creating new shift...');
    try {
      const success = await FirestoreService.saveShift(activeCompany.companyId, shiftData);
      dismiss();
      if (success) {
        setIsModalOpen(false);
        showSuccess(`✓ Successfully ${editingShift ? 'Updated' : 'Created'}: Shift "${shiftData.shiftName}" (${shiftData.shiftCode})`);
      } else {
        showError('✕ Save Failed: Unable to save shift.');
      }
    } catch (err: any) {
      dismiss();
      handleError(err, '✕ Save Shift Failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (shiftId: string) => {
    const shift = shifts.find(s => s.id === shiftId);
    const confirmed = await confirm({
      title: 'Delete Shift',
      message: `Are you sure you want to delete shift "${shift?.shiftName || shiftId}"?`,
      confirmLabel: 'Delete Shift',
      cancelLabel: 'Cancel',
      isDestructive: true
    });

    if (!confirmed) {
      showCancelled('🚫 Shift deletion cancelled');
      return;
    }

    const dismiss = showLoading('Deleting shift...');
    try {
      await FirestoreService.deleteShift(activeCompany.companyId, shiftId);
      dismiss();
      showSuccess(`✓ Successfully Deleted: Shift "${shift?.shiftName || shiftId}"`);
    } catch (err: any) {
      dismiss();
      handleError(err, '✕ Delete Shift Failed');
    }
  };

  const filteredShifts = shifts.filter(s => 
    s.shiftName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.shiftCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-black dark:text-white flex items-center gap-2">
            <Clock className="w-6 h-6 text-indigo-600" /> Shift Master
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Configure standard working hours and shift policies.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-md"
        >
          <Plus className="w-4 h-4" /> Create Shift
        </button>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search shifts by name or code..."
          className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredShifts.map(shift => (
              <motion.div
                key={shift.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-black dark:text-white">{shift.shiftName}</h3>
                    <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{shift.shiftCode}</span>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleOpenModal(shift)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(shift.id)} className="p-2 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-lg text-rose-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-tighter">Timings</p>
                    <p className="font-medium text-black dark:text-white flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" /> {shift.startTime} - {shift.endTime}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-tighter">Grace Period</p>
                    <p className="font-medium text-black dark:text-white">{shift.gracePeriodMinutes} mins</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex gap-1">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                      <span
                        key={idx}
                        className={`w-6 h-6 flex items-center justify-center text-[11px] font-bold rounded-full ${
                          shift.weeklyOffDays.includes(idx)
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30'
                        }`}
                      >
                        {day}
                      </span>
                    ))}
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${
                    shift.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {shift.status}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm animate-in fade-in">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-black dark:text-white">{editingShift ? 'Edit Shift' : 'Create New Shift'}</h3>
              <button onClick={handleCloseModal} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                <XCircle className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Shift Name</label>
                  <input
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Day Shift"
                    value={form.shiftName}
                    onChange={(e) => setForm({ ...form, shiftName: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Shift Code</label>
                  <input
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                    placeholder="DS-01"
                    value={form.shiftCode}
                    onChange={(e) => setForm({ ...form, shiftCode: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Start Time</label>
                  <input
                    type="time"
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">End Time</label>
                  <input
                    type="time"
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Grace (Min)</label>
                  <input
                    type="number"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.gracePeriodMinutes}
                    onChange={(e) => setForm({ ...form, gracePeriodMinutes: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Break (Min)</label>
                  <input
                    type="number"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.breakDurationMinutes}
                    onChange={(e) => setForm({ ...form, breakDurationMinutes: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Min Work (Min)</label>
                  <input
                    type="number"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.minWorkMinutes}
                    onChange={(e) => setForm({ ...form, minWorkMinutes: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Weekly Off Days</label>
                <div className="flex gap-2">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        const offs = [...(form.weeklyOffDays || [])];
                        if (offs.includes(idx)) {
                          setForm({ ...form, weeklyOffDays: offs.filter(d => d !== idx) });
                        } else {
                          setForm({ ...form, weeklyOffDays: [...offs, idx] });
                        }
                      }}
                      className={`flex-1 aspect-square rounded-xl font-bold text-sm transition-all ${
                        form.weeklyOffDays?.includes(idx)
                          ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/25'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-2.5 rounded-xl font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-8 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-lg shadow-indigo-600/25"
                >
                  {editingShift ? 'Update Shift' : 'Create Shift'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
