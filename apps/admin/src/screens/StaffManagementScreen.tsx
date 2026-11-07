import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Add01Icon,
  Edit01Icon,
  Delete01Icon,
  Alert01Icon,
  UserGroupIcon,
  Search01Icon,
  QrCodeIcon,
} from '@hugeicons/core-free-icons';
import { Badge, SlideUp } from '@tiptable/ui';
import { MotionButton } from '../components/motion/button.js';
import { useAuth } from '../context/AuthContext.js';
import {
  api,
  ApiError,
  type StaffAdminItem,
  type CreateStaffInput,
  type UpdateStaffInput,
} from '../services/api.js';
import { VpaQrScannerModal } from '../components/VpaQrScannerModal.js';

export const StaffManagementScreen: React.FC = () => {
  const { user, restaurant } = useAuth();
  const queryClient = useQueryClient();
  const restaurantId = user?.restaurantId || restaurant?.id || '';

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffAdminItem | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<StaffAdminItem | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Form states for Add/Edit
  const [displayName, setDisplayName] = useState('');
  const [roleLabel, setRoleLabel] = useState('Server');
  const [vpa, setVpa] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const handleVpaCaptured = (scannedVpa: string, payeeName?: string) => {
    setVpa(scannedVpa);
    if (!displayName.trim() && payeeName) {
      setDisplayName(payeeName);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['admin-staff', restaurantId],
    queryFn: () => (restaurantId ? api.getStaffList(restaurantId) : Promise.reject()),
    enabled: Boolean(restaurantId),
  });

  const staffList = data?.staff || [];

  const filteredStaff = staffList.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      s.displayName.toLowerCase().includes(q) ||
      (s.roleLabel && s.roleLabel.toLowerCase().includes(q))
    );
  });

  const createMutation = useMutation({
    mutationFn: (newStaff: CreateStaffInput) => api.createStaff(restaurantId, newStaff),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-staff', restaurantId] });
      closeModals();
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setFormError(err.problem.detail || err.problem.title);
      } else {
        setFormError('Failed to create staff member. Please check details.');
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { staffId: string; data: UpdateStaffInput }) =>
      api.updateStaff(restaurantId, vars.staffId, vars.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-staff', restaurantId] });
      closeModals();
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setFormError(err.problem.detail || err.problem.title);
      } else {
        setFormError('Failed to update staff member.');
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (staffId: string) => api.deleteStaff(restaurantId, staffId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-staff', restaurantId] });
      setDeletingStaff(null);
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (staffId: string) => api.toggleStaffActive(restaurantId, staffId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-staff', restaurantId] });
    },
  });

  const openAddModal = () => {
    setDisplayName('');
    setRoleLabel('Server');
    setVpa('');
    setPhotoPreview(null);
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (staff: StaffAdminItem) => {
    setDisplayName(staff.displayName);
    setRoleLabel(staff.roleLabel || 'Server');
    setVpa('');
    setPhotoPreview(staff.photoUrl);
    setFormError(null);
    setEditingStaff(staff);
  };

  const closeModals = () => {
    setIsAddModalOpen(false);
    setEditingStaff(null);
    setFormError(null);
  };

  // Client-side image crop & compression
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = Math.min(img.width, img.height);
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const startX = (img.width - size) / 2;
          const startY = (img.height - size) / 2;
          ctx.drawImage(img, startX, startY, size, size, 0, 0, 256, 256);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setPhotoPreview(compressedDataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!displayName.trim()) {
      setFormError('Display name is required.');
      return;
    }

    if (isAddModalOpen) {
      if (!vpa.trim() || !vpa.includes('@')) {
        setFormError('A valid UPI VPA (handle@psp) is required.');
        return;
      }
      const payload: CreateStaffInput = {
        displayName: displayName.trim(),
        roleLabel: roleLabel.trim() || 'Server',
        vpa: vpa.trim(),
      };
      if (photoPreview) {
        payload.photoUrl = photoPreview;
      }
      createMutation.mutate(payload);
    } else if (editingStaff) {
      const updateData: UpdateStaffInput = {
        displayName: displayName.trim(),
        roleLabel: roleLabel.trim() || 'Server',
      };
      if (vpa.trim()) {
        updateData.vpa = vpa.trim();
      }
      if (photoPreview !== null) {
        updateData.photoUrl = photoPreview;
      }
      updateMutation.mutate({
        staffId: editingStaff.id,
        data: updateData,
      });
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Header */}
      <SlideUp>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-200/60">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif tracking-tight text-stone-900 font-normal leading-[1.08] text-left">
              Staff Management
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-stone-500 font-sans tracking-tight">
              Manage your waitstaff roster, role tags, and direct UPI Virtual Payment Addresses.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <MotionButton variant="primary" size="sm" onClick={openAddModal} className="px-4 py-2">
              <HugeiconsIcon icon={Add01Icon} className="w-4 h-4" strokeWidth={1.5} />
              <span>Add Team Member</span>
            </MotionButton>
          </div>
        </div>
      </SlideUp>

      {/* Search & Statistics Bar */}
      <SlideUp delay={50}>
        <div className="flex items-center justify-between gap-4 bg-white/90 backdrop-blur-xs p-3.5 rounded-2xl border border-stone-200/70 shadow-2xs">
          <div className="relative flex-1 max-w-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
              <HugeiconsIcon icon={Search01Icon} className="w-4 h-4" strokeWidth={1.5} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or role..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-stone-200/80 bg-stone-50/70 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:bg-white focus:border-stone-400 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] transition-all"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-stone-500 pr-2">
            <span>
              Total: <strong className="text-stone-800">{staffList.length}</strong>
            </span>
            <span>•</span>
            <span>
              Active:{' '}
              <strong className="text-emerald-700">
                {staffList.filter((s) => s.isActive).length}
              </strong>
            </span>
          </div>
        </div>
      </SlideUp>

      {/* Staff Roster Table */}
      <SlideUp delay={100}>
        <div className="rounded-2xl border border-stone-200/70 bg-white/90 backdrop-blur-xs shadow-2xs overflow-hidden">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-stone-400">
              <div className="w-6 h-6 border-2 border-stone-900 border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-xs">Loading waitstaff roster...</p>
            </div>
          ) : filteredStaff.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50/60 text-stone-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-5">Staff Member</th>
                    <th className="py-3.5 px-5">Role</th>
                    <th className="py-3.5 px-5">Direct UPI VPA</th>
                    <th className="py-3.5 px-5">Status</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredStaff.map((staff) => (
                    <tr key={staff.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-stone-100 border border-stone-200/60 overflow-hidden flex-shrink-0 flex items-center justify-center text-stone-700 font-semibold text-xs shadow-2xs">
                            {staff.photoUrl ? (
                              <img
                                src={staff.photoUrl}
                                alt={staff.displayName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              staff.displayName
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .slice(0, 2)
                                .toUpperCase()
                            )}
                          </div>
                          <div>
                            <span className="font-medium text-stone-900 block text-sm tracking-tight">
                              {staff.displayName}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-stone-600 font-medium">
                        {staff.roleLabel || 'Server'}
                      </td>
                      <td className="py-3.5 px-5 font-mono text-stone-600 text-xs">
                        {staff.maskedVpa}
                      </td>
                      <td className="py-3.5 px-5">
                        <button
                          type="button"
                          onClick={() => toggleStatusMutation.mutate(staff.id)}
                          className="focus:outline-none cursor-pointer"
                        >
                          <Badge variant={staff.isActive ? 'success' : 'neutral'}>
                            {staff.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </button>
                      </td>
                      <td className="py-3.5 px-5 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(staff)}
                          aria-label={`Edit ${staff.displayName}`}
                          className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <HugeiconsIcon icon={Edit01Icon} className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingStaff(staff)}
                          aria-label={`Remove ${staff.displayName}`}
                          className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <HugeiconsIcon
                            icon={Delete01Icon}
                            className="w-4 h-4"
                            strokeWidth={1.5}
                          />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-16 px-4 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-stone-100 border border-stone-200/70 flex items-center justify-center text-stone-400 mb-3 shadow-2xs">
                <HugeiconsIcon icon={UserGroupIcon} className="w-6 h-6" strokeWidth={1.5} />
              </div>
              <h4 className="font-semibold text-stone-900 text-base tracking-tight">
                {searchQuery ? 'No matching staff members' : 'No waitstaff added yet'}
              </h4>
              <p className="text-xs text-stone-500 mt-1 max-w-sm leading-relaxed">
                {searchQuery
                  ? 'Try adjusting your search criteria.'
                  : 'Add your service team members with their UPI Virtual Payment Addresses to enable direct guest tipping.'}
              </p>
              {!searchQuery && (
                <MotionButton
                  variant="primary"
                  size="sm"
                  onClick={openAddModal}
                  className="mt-5 px-4 py-2"
                >
                  <HugeiconsIcon icon={Add01Icon} className="w-4 h-4" strokeWidth={1.5} />
                  <span>Add Team Member</span>
                </MotionButton>
              )}
            </div>
          )}
        </div>
      </SlideUp>

      {/* Add / Edit Staff Modal */}
      {(isAddModalOpen || editingStaff) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-2xl border border-stone-200/80 shadow-2xl overflow-hidden p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="text-base font-semibold text-stone-900 tracking-tight">
                {isAddModalOpen ? 'Add Team Member' : `Edit ${editingStaff?.displayName}`}
              </h3>
              <button
                type="button"
                onClick={closeModals}
                className="text-stone-400 hover:text-stone-600 text-lg leading-none p-1 cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                  {formError}
                </div>
              )}

              {/* Warning Banner on VPA Integrity */}
              <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-2.5">
                <HugeiconsIcon
                  icon={Alert01Icon}
                  className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5"
                  strokeWidth={1.5}
                />
                <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
                  Double-check the VPA. A wrong VPA sends diner tips directly to the wrong person.
                  rwrd does not hold or mediate funds.
                </p>
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Display name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-stone-200 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-400 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] transition-all"
                />
              </div>

              {/* Role Label */}
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Role label</label>
                <input
                  type="text"
                  value={roleLabel}
                  onChange={(e) => setRoleLabel(e.target.value)}
                  placeholder="e.g. Server, Bartender, Host"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-stone-200 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-400 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] transition-all"
                />
                <div className="flex gap-1.5 mt-2">
                  {['Server', 'Head Waiter', 'Bartender', 'Host'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setRoleLabel(tag)}
                      className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200/70 text-[10px] font-medium text-stone-700 transition-colors cursor-pointer"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* UPI VPA */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-stone-700">
                    UPI VPA (Virtual Payment Address){' '}
                    {isAddModalOpen && <span className="text-rose-500">*</span>}
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsScannerOpen(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-800 hover:text-stone-950 underline underline-offset-2 transition-colors cursor-pointer"
                  >
                    <HugeiconsIcon icon={QrCodeIcon} className="w-3.5 h-3.5" strokeWidth={1.5} />
                    <span>Scan UPI QR</span>
                  </button>
                </div>
                <input
                  type="text"
                  required={isAddModalOpen}
                  value={vpa}
                  onChange={(e) => setVpa(e.target.value)}
                  placeholder={
                    editingStaff
                      ? `Leave blank to keep existing (${editingStaff.maskedVpa})`
                      : 'e.g. rahul@okaxis, priya@okhdfcbank'
                  }
                  className="w-full px-3 py-2 rounded-xl bg-white border border-stone-200 text-xs font-mono text-stone-900 placeholder:font-sans placeholder:text-stone-400 focus:outline-none focus:border-stone-400 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] transition-all"
                />
              </div>

              {/* Photo Upload with Client-Side Preview/Compression */}
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Photo (client-side square crop & compression)
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-stone-100 border border-stone-200/60 overflow-hidden flex items-center justify-center flex-shrink-0 text-stone-400 shadow-2xs">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <HugeiconsIcon icon={UserGroupIcon} className="w-5 h-5" strokeWidth={1.5} />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="block w-full text-xs text-stone-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-medium file:bg-stone-100 file:text-stone-700 hover:file:bg-stone-200 cursor-pointer"
                    />
                    <p className="text-[10px] text-stone-400 mt-0.5">
                      Auto-resized and compressed to 256×256 square.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-stone-100">
                <MotionButton variant="ghost" size="sm" onClick={closeModals}>
                  Cancel
                </MotionButton>
                <MotionButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2"
                >
                  {isAddModalOpen ? 'Add Staff Member' : 'Save Changes'}
                </MotionButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm bg-white/95 backdrop-blur-md rounded-2xl border border-stone-200/80 shadow-2xl p-6 space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200/60 text-rose-600 flex items-center justify-center shadow-2xs">
              <HugeiconsIcon icon={Delete01Icon} className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-stone-900 tracking-tight">
                Remove {deletingStaff.displayName}?
              </h3>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                This will soft delete the staff member from active tipping rosters. Historical tip
                intents and analytics will remain preserved.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <MotionButton variant="ghost" size="sm" onClick={() => setDeletingStaff(null)}>
                Cancel
              </MotionButton>
              <MotionButton
                variant="danger"
                size="sm"
                isLoading={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deletingStaff.id)}
              >
                Remove Staff
              </MotionButton>
            </div>
          </div>
        </div>
      )}
      {/* VPA QR Code Scanner Modal */}
      <VpaQrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onVpaCaptured={handleVpaCaptured}
      />
    </div>
  );
};
