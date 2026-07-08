import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../api/auth';
import { useTranslation } from '../i18n/context';
import { getErrorMessage } from '../utils/error';
import { AvatarCropper } from '../components/AvatarCropper';
import { ArrowLeft, Save, Loader2, Upload, User } from 'lucide-react';

export function EditProfilePage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);

  const [username, setUsername] = useState(user?.username ?? '');
  const [avatar, setAvatar] = useState(user?.avatar ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    setSaving(true);
    setError('');
    try {
      const updated = await authApi.updateProfile({
        username: username.trim(),
        avatar: avatar.trim() || undefined,
        bio: bio.trim() || undefined,
      });
      setUser(updated);
      navigate('/profile');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Update failed'));
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="container mx-auto max-w-xl px-4 py-8 md:py-12">
      <Link
        to="/profile"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-600 transition-colors mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t('common.back')}
      </Link>

      <h1 className="text-2xl font-bold text-neutral-900 mb-8">{t('profile.editProfile')}</h1>

      {error && (
        <div className="mb-6 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Avatar 上传与裁剪 */}
        <div className="flex flex-col items-center gap-3">
          {avatar ? (
            <img src={avatar} alt="" className="h-24 w-24 rounded-2xl object-cover" />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
              <User className="h-10 w-10" />
            </div>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 cursor-pointer"
          >
            <Upload className="h-4 w-4" />
            {avatar ? '更换头像' : '上传头像'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              if (!f.type.startsWith('image/')) {
                alert('请选择图片文件');
                return;
              }
              const reader = new FileReader();
              reader.onload = () => setCropSrc(reader.result as string);
              reader.readAsDataURL(f);
            }}
          />
          {cropSrc && (
            <AvatarCropper
              imageSrc={cropSrc}
              onCancel={() => setCropSrc(null)}
              onUploaded={(url) => {
                setAvatar(url);
                setCropSrc(null);
              }}
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">{t('auth.username')}</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-50 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">{t('profile.bio')}</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={t('profile.bioPlaceholder')}
            rows={4}
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700 placeholder:text-neutral-300 transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-50 outline-none resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={saving || !username.trim()}
          className="w-full rounded-xl bg-neutral-900 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          {saving ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> {t('editor.saving')}</>
          ) : (
            <><Save className="h-4 w-4" /> {t('profile.update')}</>
          )}
        </button>
      </form>
    </div>
  );
}
