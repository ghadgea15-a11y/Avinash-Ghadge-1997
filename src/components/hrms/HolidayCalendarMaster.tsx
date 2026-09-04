import React, { useState } from 'react';
import { Calendar, Plus, Trash2, Edit2, CalendarDays, MapPin } from 'lucide-react';
import { HolidayRecord } from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { useFeedback } from '../../context/ActionFeedbackContext';

interface Props {
  companyId?: string;
  userSession?: any;
  company?: any;
  holidays?: HolidayRecord[];
  onHolidaysChange?: () => void;
  isLoading?: boolean;
}

export const HolidayCalendarMaster: React.FC<Props> = ({ companyId, userSession, company, holidays = [], onHolidaysChange }) => {
  const targetCompanyId = companyId || company?.id || userSession?.targetCompanyId || '';
  const { showSuccess, handleError, showLoading, confirm } = useFeedback();
  const [showForm, setShowForm] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<HolidayRecord | null>(null);

  const [formData, setFormData] = useState<Partial<HolidayRecord>>({
    name: '',
    date: '',
    type: 'PUBLIC',
    description: '',
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const dismiss = showLoading('Saving holiday...');
    try {
      await FirestoreService.saveHoliday(targetCompanyId, {
        ...editingHoliday,
        ...formData
      } as HolidayRecord);
      dismiss();
      showSuccess('✓ Holiday saved successfully');
      setShowForm(false);
      setEditingHoliday(null);
      setFormData({ name: '', date: '', type: 'PUBLIC', description: '' });
      onHolidaysChange();
    } catch (err) {
      dismiss();
      handleError(err, 'Failed to save holiday');
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Delete Holiday',
      message: 'Are you sure you want to delete this holiday?',
      confirmLabel: 'Delete',
      isDestructive: true
    });
    if (!ok) return;

    const dismiss = showLoading('Deleting...');
    try {
      await FirestoreService.deleteHoliday(targetCompanyId, id);
      dismiss();
      showSuccess('✓ Holiday deleted');
      onHolidaysChange();
    } catch (err) {
      dismiss();
      handleError(err, 'Failed to delete holiday');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-black text-black flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-indigo-600" />
            Holiday Calendar
          </h3>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Manage public and restricted holidays</p>
        </div>
        <button
          onClick={() => {
            setEditingHoliday(null);
            setFormData({ name: '', date: '', type: 'PUBLIC', description: '' });
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-sm shadow-indigo-200"
        >
          <Plus className="w-4 h-4" />
          Add Holiday
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-2xl border-2 border-indigo-100 shadow-sm mb-6">
          <h4 className="text-sm font-bold text-black uppercase tracking-widest mb-4">
            {editingHoliday ? 'Edit Holiday' : 'New Holiday'}
          </h4>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Holiday Name</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none text-black font-bold"
                  placeholder="e.g., Diwali"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Date</label>
                <input
                  type="date"
                  required
                  value={formData.date || ''}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none text-black font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Type</label>
                <select
                  value={formData.type || 'PUBLIC'}
                  onChange={e => setFormData({ ...formData, type: e.target.value as 'PUBLIC' | 'RESTRICTED' })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none text-black font-bold"
                >
                  <option value="PUBLIC">Public / National Holiday</option>
                  <option value="RESTRICTED">Restricted / Optional Holiday</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Description</label>
                <input
                  type="text"
                  value={formData.description || ''}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none text-black font-bold"
                  placeholder="Optional details"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-black transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-sm shadow-indigo-200"
              >
                Save Holiday
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {holidays.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-bold">No holidays configured for this year.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Holiday</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {holidays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(holiday => (
                  <tr key={holiday.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-black">{new Date(holiday.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                      <div className="text-xs text-slate-500">{new Date(holiday.date).toLocaleDateString('en-GB', { weekday: 'long' })}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-black">{holiday.name}</div>
                      {holiday.description && <div className="text-xs text-slate-500">{holiday.description}</div>}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold ${
                        holiday.type === 'PUBLIC' 
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {holiday.type}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setEditingHoliday(holiday);
                          setFormData(holiday);
                          setShowForm(true);
                        }}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(holiday.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
