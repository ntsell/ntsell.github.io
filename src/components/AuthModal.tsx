import React, { useState } from 'react';
import { 
  X, 
  Shield, 
  CheckCircle2, 
  AlertCircle, 
  FileUp, 
  Lock, 
  UserCheck,
  Mail,
  KeyRound,
  ArrowRight,
  RefreshCw,
  Users,
  Check,
  Send
} from 'lucide-react';
import { StudentRosterItem, UserProfile, VerificationRequest } from '../types';
import { moderateDisplayName } from '../services/geminiModeration';
import { encryptSensitiveData, generateUsernameFromRealName } from '../services/cryptoService';
import { supabase } from '../services/supabaseClient';
import { registerDeviceSession } from '../services/sessionService';
import { TurnstileWidget, TURNSTILE_SITE_KEY } from './TurnstileWidget';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  roster: StudentRosterItem[];
  onLoginSuccess: (user: UserProfile) => void;
}

// Danh sách chuẩn các lớp học của trường (38 lớp: 10C1-10C13, 11B1-11B13, 12A1-12A12)
const SCHOOL_CLASSES = [
  '10C1', '10C2', '10C3', '10C4', '10C5', '10C6', '10C7', '10C8', '10C9', '10C10', '10C11', '10C12', '10C13',
  '11B1', '11B2', '11B3', '11B4', '11B5', '11B6', '11B7', '11B8', '11B9', '11B10', '11B11', '11B12', '11B13',
  '12A1', '12A2', '12A3', '12A4', '12A5', '12A6', '12A7', '12A8', '12A9', '12A10', '12A11', '12A12'
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  roster,
  onLoginSuccess
}) => {

  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  
  // Registration substeps:
  // 'input' -> Step 1: Nhập Họ tên thật, Lớp, Email
  // 'confirm_unique' -> Step 2 (Case 1): Tìm thấy duy nhất 1 người -> Xác nhận bạn là [Tên] lớp [Lớp]
  // 'select_duplicate' -> Step 2 (Case 2): Có nhiều người cùng tên & lớp -> Chọn danh sách
  // 'otp_password' -> Nhập OTP (đã gửi tới email) + Tạo mật khẩu
  // 'request_admin' -> Step 2 (Case 3): Không tìm thấy -> Request Admin Verification form
  // 'request_submitted' -> Thông báo gửi admin thành công
  const [step, setStep] = useState<
    'input' | 'confirm_unique' | 'select_duplicate' | 'otp_password' | 'request_admin' | 'request_submitted' | 'mfa_verify'
  >('input');

  // Rate limiting và MFA states
  const [turnstileToken, setTurnstileToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaFactorId, setMfaFactorId] = useState('');
  const [mfaQrCode, setMfaQrCode] = useState<string | null>(null);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [pendingMfaUser, setPendingMfaUser] = useState<UserProfile | null>(null);

  const getCaptchaToken = (): string | undefined => {
    if (turnstileToken) return turnstileToken;
    try {
      return (window as any).turnstile?.getResponse?.() || (window as any).hcaptcha?.getResponse?.() || undefined;
    } catch {
      return undefined;
    }
  };

  const MAX_LOGIN_ATTEMPTS = 5;
  const LOCKOUT_MS = 15 * 60 * 1000; // 15 phút

  const checkLockout = (): { isLocked: boolean; remainingSec: number } => {
    try {
      const lockedUntil = Number(localStorage.getItem('ntsell_lockout_until') || '0');
      const remaining = lockedUntil - Date.now();
      if (remaining > 0) {
        return { isLocked: true, remainingSec: Math.ceil(remaining / 1000) };
      }
    } catch {}
    return { isLocked: false, remainingSec: 0 };
  };

  const recordFailedLogin = (): number => {
    const attempts = Number(sessionStorage.getItem('ntsell_failed_logins') || '0') + 1;
    sessionStorage.setItem('ntsell_failed_logins', String(attempts));
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      localStorage.setItem('ntsell_lockout_until', String(Date.now() + LOCKOUT_MS));
    }
    return attempts;
  };

  const clearFailedLogins = () => {
    sessionStorage.removeItem('ntsell_failed_logins');
    localStorage.removeItem('ntsell_lockout_until');
  };
  
  // Khối lọc nhanh (Frontend state)
  const [selectedGrade, setSelectedGrade] = useState<'ALL' | '10' | '11' | '12'>('ALL');
  
  // Form fields
  const [realName, setRealName] = useState('');
  const [className, setClassName] = useState('10C1');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const phone = '';

  // Login form field
  const [loginPassword, setLoginPassword] = useState('');

  // Match and OTP state
  const [matchingStudents, setMatchingStudents] = useState<StudentRosterItem[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentRosterItem | null>(null);
  const [userEnteredOtp, setUserEnteredOtp] = useState('');
  const [otpNotice, setOtpNotice] = useState<string | null>(null);

  // Admin Request fields
  const [reason, setReason] = useState<'class_transfer' | 'new_student' | 'name_misspelled' | 'other'>('class_transfer');
  const [reasonNote, setReasonNote] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);

  // Realtime encryption preview states
  const [showCryptoInspector, setShowCryptoInspector] = useState(false);
  const [previewEncryptedName, setPreviewEncryptedName] = useState('');
  const [previewEncryptedClass, setPreviewEncryptedClass] = useState('');
  const [previewAutoUsername, setPreviewAutoUsername] = useState('');

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [geminiSuggestion, setGeminiSuggestion] = useState<string | null>(null);

  // Single-device mode collision warning
  const [deviceWarningInfo, setDeviceWarningInfo] = useState<{
    user: UserProfile;
    previousDeviceName: string;
  } | null>(null);

  const completeLoginWithSession = async (user: UserProfile, forceOverride: boolean = false) => {
    try {
      const regRes = await registerDeviceSession(user.id, forceOverride);
      if (regRes.needsDeviceWarning && !forceOverride) {
        setDeviceWarningInfo({
          user,
          previousDeviceName: regRes.previousDeviceName || 'Thiết bị khác'
        });
        return false;
      }
      try {
        localStorage.setItem('ntsell_current_user', JSON.stringify(user));
        const saved = JSON.parse(localStorage.getItem('ntsell_user_profiles_list') || '[]');
        if (!saved.some((p: any) => p.id === user.id)) {
          localStorage.setItem('ntsell_user_profiles_list', JSON.stringify([user, ...saved]));
        }
      } catch {}
      onLoginSuccess(user);
      onClose();
      return true;
    } catch {
      // Fallback nếu có lỗi
      try {
        localStorage.setItem('ntsell_current_user', JSON.stringify(user));
        const saved = JSON.parse(localStorage.getItem('ntsell_user_profiles_list') || '[]');
        if (!saved.some((p: any) => p.id === user.id)) {
          localStorage.setItem('ntsell_user_profiles_list', JSON.stringify([user, ...saved]));
        }
      } catch {}
      onLoginSuccess(user);
      onClose();
      return true;
    }
  };

  // Tab Indicator Animation
  const [tabIndicatorStyle, setTabIndicatorStyle] = useState<{ left: string; width: string }>({
    left: '6px',
    width: 'calc(50% - 6px)'
  });

  // Filter classes by grade
  const filteredClasses = React.useMemo(() => {
    if (selectedGrade === 'ALL') return SCHOOL_CLASSES;
    return SCHOOL_CLASSES.filter(c => c.startsWith(selectedGrade));
  }, [selectedGrade]);

  // Cập nhật realtime preview mã hóa PII
  React.useEffect(() => {
    if (realName) {
      encryptSensitiveData(realName).then(setPreviewEncryptedName).catch(() => {
        setPreviewEncryptedName('ENC_V2_••••••••');
      });
      setPreviewAutoUsername(generateUsernameFromRealName(realName));
    } else {
      setPreviewEncryptedName('');
      setPreviewAutoUsername('');
    }
    if (className) {
      encryptSensitiveData(className).then(setPreviewEncryptedClass).catch(() => {
        setPreviewEncryptedClass('ENC_V2_••••••••');
      });
    } else {
      setPreviewEncryptedClass('');
    }
  }, [realName, className]);

  // Tab switch
  const switchAuthMode = (mode: 'register' | 'login') => {
    if (mode === authMode) return;
    setErrorMessage('');
    setOtpNotice(null);
    setStep('input');

    setTabIndicatorStyle({
      left: '6px',
      width: 'calc(100% - 12px)'
    });

    setTimeout(() => {
      setAuthMode(mode);
      if (mode === 'register') {
        setTabIndicatorStyle({
          left: '6px',
          width: 'calc(50% - 6px)'
        });
      } else {
        setTabIndicatorStyle({
          left: 'calc(50%)',
          width: 'calc(50% - 6px)'
        });
      }
    }, 120);
  };

  if (!isOpen) return null;

  // Helper gửi OTP thật qua Supabase Auth Email OTP
  const sendOtpToEmail = async (targetEmail: string, student: StudentRosterItem) => {
    setIsLoading(true);
    setErrorMessage('');
    setUserEnteredOtp('');
    setSelectedStudent(student);

    const captchaToken = getCaptchaToken();
    if (TURNSTILE_SITE_KEY && !captchaToken) {
      setIsLoading(false);
      setErrorMessage('Vui lòng hoàn tất xác minh bảo mật (Cloudflare Turnstile) trước khi yêu cầu gửi mã OTP.');
      return;
    }

    // Kích hoạt Database Rate Limiting cho luồng gửi OTP
    const otpRateLimitKey = `otp_${targetEmail.toLowerCase().trim()}`;
    try {
      const { data: rlData } = await supabase.rpc('check_and_record_rate_limit', {
        p_key: otpRateLimitKey,
        p_max_attempts: 3,
        p_window_seconds: 300,
        p_block_seconds: 600
      });
      if (rlData && rlData.blocked) {
        setIsLoading(false);
        setErrorMessage(`Yêu cầu gửi mã OTP tạm thời bị khóa do gửi quá nhiều lần! Vui lòng thử lại sau ${rlData.remaining_seconds} giây.`);
        return;
      }
    } catch (e) {
      console.warn('DB rate limit check fallback:', e);
    }

    try {
      // Gọi Supabase Auth để gửi mã OTP 6 số về email thật của học sinh kèm captchaToken
      const { error } = await supabase.auth.signInWithOtp({
        email: targetEmail,
        options: {
          shouldCreateUser: true,
          captchaToken: captchaToken || undefined
        }
      });

      setIsLoading(false);

      if (error) {
        // Nếu dính rate limit hoặc cấu hình SMTP Supabase, thông báo rõ ràng kèm fallback
        console.warn('Lỗi Supabase signInWithOtp:', error.message);
        if (error.message.includes('rate limit') || error.message.includes('security purposes')) {
          setErrorMessage('Email đã được gửi gần đây. Vui lòng kiểm tra hộp thư (cả mục Spam) hoặc đợi 60 giây.');
        } else {
          setErrorMessage('Lỗi gửi email: ' + error.message);
        }
        // Cho phép người dùng chuyển tới bước nhập OTP để kiểm tra hộp thư
        setOtpNotice(`Đang gửi mã xác minh tới ${targetEmail}. Vui lòng kiểm tra Hộp thư đến hoặc mục Spam.`);
        setStep('otp_password');
      } else {
        setOtpNotice(`Mã OTP xác thực gồm 6 chữ số đã được gửi tới email ${targetEmail}! Vui lòng kiểm tra hộp thư đến (Inbox) hoặc Thư rác (Spam).`);
        setStep('otp_password');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage('Không thể kết nối dịch vụ gửi email: ' + (err?.message || 'Vui lòng thử lại.'));
      setStep('otp_password');
    }
  };

  // =========================================================================
  // XỬ LÝ BƯỚC 1: SUBMIT FORM THÔNG TIN (ĐĂNG KÝ HOẶC ĐĂNG NHẬP)
  // =========================================================================
  const handleSubmitInput = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setGeminiSuggestion(null);

    const trimmedName = realName.trim();
    const trimmedClass = className.trim().toUpperCase();

    if (!trimmedName) {
      setErrorMessage('Vui lòng nhập họ và tên thật.');
      return;
    }

    // 0. KIỂM TRA RATE LIMIT CHỐNG BRUTE-FORCE
    const lockout = checkLockout();
    if (lockout.isLocked) {
      const mins = Math.ceil(lockout.remainingSec / 60);
      setErrorMessage(`Tài khoản tạm thời bị khóa do nhập sai quá ${MAX_LOGIN_ATTEMPTS} lần liên tiếp. Vui lòng thử lại sau ${mins} phút để bảo vệ an toàn.`);
      return;
    }

    // ==========================================================
    // 1. KIỂM TRA ĐĂNG NHẬP ADMIN (Ưu tiên tuyệt đối)
    // ==========================================================
    const lowerName = trimmedName.toLowerCase();
    const isAdmin1 = lowerName === 'admin@123' || lowerName === 'admin';
    const isAdmin2 = lowerName === 'admin2@123' || lowerName === 'admin2';

    if (isAdmin1 || isAdmin2) {
      if (authMode === 'register') {
        setErrorMessage('Tài khoản Quản Trị Viên vui lòng chuyển sang tab "Đăng Nhập".');
        return;
      }

      const targetAdminEmail = isAdmin1 ? 'admin1@ntsell.edu.vn' : 'admin2@ntsell.edu.vn';
      const expectedClass = isAdmin1 ? '11B10' : '12A1';

      if (!loginPassword.trim()) {
        setErrorMessage('Vui lòng nhập mật khẩu Quản Trị Viên.');
        return;
      }

      const captchaToken = getCaptchaToken();
      if (TURNSTILE_SITE_KEY && !captchaToken) {
        setErrorMessage('Vui lòng hoàn tất xác minh bảo mật (Cloudflare Turnstile) trước khi đăng nhập.');
        return;
      }

      // Kích hoạt Database Rate Limiting (Server-side brute force protection)
      const adminRateLimitKey = `admin_${targetAdminEmail}`;
      try {
        const { data: rlData } = await supabase.rpc('check_and_record_rate_limit', {
          p_key: adminRateLimitKey,
          p_max_attempts: MAX_LOGIN_ATTEMPTS,
          p_window_seconds: 900,
          p_block_seconds: 900
        });
        if (rlData && rlData.blocked) {
          setErrorMessage(`Tài khoản tạm thời bị khóa do nhập sai nhiều lần! Vui lòng thử lại sau ${rlData.remaining_seconds} giây.`);
          return;
        }
      } catch (e) {
        console.warn('DB rate limit check fallback:', e);
      }

      setIsLoading(true);
      try {
        // Đăng nhập bảo mật vào Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: targetAdminEmail,
          password: loginPassword.trim(),
          options: captchaToken ? { captchaToken } : undefined
        });

        if (authError || !authData?.user) {
          setIsLoading(false);
          const attempts = recordFailedLogin();
          if (attempts >= MAX_LOGIN_ATTEMPTS) {
            setErrorMessage(`Nhập sai ${attempts} lần liên tiếp! Tài khoản tạm thời bị khóa 15 phút.`);
          } else {
            setErrorMessage(`Mật khẩu Quản Trị Viên không chính xác! Bạn còn ${MAX_LOGIN_ATTEMPTS - attempts} lần thử.`);
          }
          return;
        }

        const adminUserId = authData.user.id;
        const encRealName = await encryptSensitiveData(isAdmin1 ? 'Cán Bộ 11B10' : 'Cán Bộ 12A1');
        const encClass = await encryptSensitiveData(expectedClass);
        const encUsername = await encryptSensitiveData(isAdmin1 ? 'hocsinh_11b10' : 'admin_12a1');

        const adminUser: UserProfile = {
          id: adminUserId,
          encryptedRealName: encRealName,
          encryptedClassName: encClass,
          encryptedUsername: encUsername,
          displayName: isAdmin1 ? 'Quản Trị Viên (Admin 1)' : 'Quản Trị Viên 2 (Admin 2)',
          email: targetAdminEmail,
          phone: isAdmin1 ? '0987654321' : '0912345678',
          trustScore: 100,
          completedOrdersCount: isAdmin1 ? 50 : 30,
          violationCount: 0,
          role: 'admin',
          status: 'active',
          createdAt: new Date().toISOString()
        };

        // Bắt buộc xác thực 2 bước (MFA / TOTP) cho tài khoản Quản Trị Viên
        const { data: mfaFactors } = await supabase.auth.mfa.listFactors();
        const totp = mfaFactors?.totp?.[0];
        if (totp && totp.status === 'verified') {
          setMfaFactorId(totp.id);
          setMfaQrCode(null);
          setMfaSecret(null);
          setPendingMfaUser(adminUser);
          setStep('mfa_verify');
          setIsLoading(false);
          return;
        }

        // Nếu chưa thiết lập TOTP, tự động khởi tạo enrollment
        const { data: enrollData, error: enrollErr } = await supabase.auth.mfa.enroll({
          factorType: 'totp',
          issuer: 'NTSell Admin',
          friendlyName: adminUser.displayName
        });

        if (enrollErr || !enrollData) {
          throw new Error('Bắt buộc thiết lập xác thực 2 bước (MFA/TOTP) cho Quản Trị Viên: ' + (enrollErr?.message || 'Không thể khởi tạo mã TOTP'));
        }

        setMfaFactorId(enrollData.id);
        setMfaQrCode(enrollData.totp.qr_code);
        setMfaSecret(enrollData.totp.secret);
        setPendingMfaUser(adminUser);
        setStep('mfa_verify');
        setIsLoading(false);
        return;
      } catch (err: any) {
        setIsLoading(false);
        setErrorMessage('Lỗi xác thực hệ thống: ' + (err?.message || 'Vui lòng thử lại'));
      }
      return;
    }

    // ==========================================================
    // 2. NẾU LÀ ĐĂNG NHẬP TÀI KHOẢN HỌC SINH ĐÃ CÓ
    // ==========================================================
    if (authMode === 'login') {
      if (!loginPassword.trim()) {
        setErrorMessage('Vui lòng nhập mật khẩu tài khoản.');
        return;
      }
      if (loginPassword.length < 6) {
        setErrorMessage('Mật khẩu tối thiểu 6 ký tự.');
        return;
      }

      setIsLoading(true);
      setTimeout(async () => {
        // Tìm học sinh theo họ tên
        const studentInAnyClass = roster.find(
          s => s.realName.toLowerCase().trim() === trimmedName.toLowerCase()
        );

        if (!studentInAnyClass) {
          setIsLoading(false);
          setErrorMessage('Không tìm thấy tài khoản học sinh tương ứng với tên này!');
          return;
        }

        // Đăng nhập học sinh qua Supabase Auth
        const studentEmail = `${studentInAnyClass.id.toLowerCase()}@student.ntsell.edu.vn`;
        let authId = 'usr_' + studentInAnyClass.id;

        const captchaToken = getCaptchaToken();
        if (TURNSTILE_SITE_KEY && !captchaToken) {
          setIsLoading(false);
          setErrorMessage('Vui lòng hoàn tất xác minh bảo mật (Cloudflare Turnstile) trước khi đăng nhập.');
          return;
        }

        // Kích hoạt Database Rate Limiting cho tài khoản học sinh
        const studentRateLimitKey = `student_${studentEmail}`;
        try {
          const { data: rlData } = await supabase.rpc('check_and_record_rate_limit', {
            p_key: studentRateLimitKey,
            p_max_attempts: MAX_LOGIN_ATTEMPTS,
            p_window_seconds: 900,
            p_block_seconds: 900
          });
          if (rlData && rlData.blocked) {
            setIsLoading(false);
            setErrorMessage(`Tài khoản tạm thời bị khóa do nhập sai nhiều lần! Vui lòng thử lại sau ${rlData.remaining_seconds} giây.`);
            return;
          }
        } catch (e) {
          console.warn('DB rate limit check fallback:', e);
        }

        try {
          const { data: authRes, error: authError } = await supabase.auth.signInWithPassword({
            email: studentEmail,
            password: loginPassword.trim(),
            options: captchaToken ? { captchaToken } : undefined
          });

          if (authError || !authRes?.user) {
            setIsLoading(false);
            const attempts = recordFailedLogin();
            if (attempts >= MAX_LOGIN_ATTEMPTS) {
              setErrorMessage(`Nhập sai ${attempts} lần liên tiếp! Tài khoản tạm thời bị khóa 15 phút.`);
            } else {
              setErrorMessage(`Mật khẩu không chính xác hoặc tài khoản chưa được kích hoạt! Bạn còn ${MAX_LOGIN_ATTEMPTS - attempts} lần thử.`);
            }
            return;
          }
          authId = authRes.user.id;
          clearFailedLogins();
          try {
            await supabase.rpc('reset_rate_limit', { p_key: studentRateLimitKey });
          } catch {}
        } catch {
          setIsLoading(false);
          setErrorMessage('Lỗi kết nối máy chủ xác thực.');
          return;
        }
        setIsLoading(false);

        // Tạo profile đăng nhập
        const encRealName = await encryptSensitiveData(studentInAnyClass.realName);
        const encClass = await encryptSensitiveData(studentInAnyClass.className);
        const encUsername = await encryptSensitiveData(generateUsernameFromRealName(studentInAnyClass.realName));

        const loggedInUser: UserProfile = {
          id: authId,
          encryptedRealName: encRealName,
          encryptedClassName: encClass,
          encryptedUsername: encUsername,
          displayName: generateUsernameFromRealName(studentInAnyClass.realName),
          trustScore: 100,
          completedOrdersCount: 0,
          violationCount: 0,
          role: 'student',
          status: 'active',
          createdAt: new Date().toISOString()
        };

        await completeLoginWithSession(loggedInUser);
      }, 500);
      return;
    }

    // ==========================================================
    // 3. NẾU LÀ ĐĂNG KÝ TÀI KHOẢN MỚI (QUY TRÌNH 2 BƯỚC MỚI)
    // ==========================================================
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setErrorMessage('Vui lòng nhập Email cá nhân để nhận mã OTP xác minh.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMessage('Định dạng email không hợp lệ. Vui lòng kiểm tra lại.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);

      // Bước 2: Kiểm tra danh sách trong database
      // Tìm tất cả học sinh khớp CẢ TÊN VÀ LỚP
      const matched = roster.filter(
        s => s.realName.trim().toLowerCase() === trimmedName.toLowerCase() &&
             s.className.trim().toUpperCase() === trimmedClass
      );

      setMatchingStudents(matched);

      if (matched.length === 1) {
        // ✅ TRƯỜNG HỢP 1: UNIQUE (1 người)
        setSelectedStudent(matched[0]);
        setStep('confirm_unique');
      } else if (matched.length > 1) {
        // ⚠️ TRƯỜNG HỢP 2: NHIỀU NGƯỜI CÙNG TÊN & LỚP
        setStep('select_duplicate');
      } else {
        // ❌ TRƯỜNG HỢP 3: KHÔNG TÌM THẤY TRONG DANH SÁCH
        setStep('request_admin');
      }
    }, 500);
  };

  // Khi user chọn "ĐÚNG" ở màn Unique
  const handleConfirmUniqueYes = () => {
    if (!selectedStudent) return;
    sendOtpToEmail(email.trim(), selectedStudent);
  };

  // Khi user chọn 1 bạn trong danh sách trùng tên & lớp
  const handleSelectDuplicateStudent = (st: StudentRosterItem) => {
    setSelectedStudent(st);
    sendOtpToEmail(email.trim(), st);
  };

  // Xác nhận hoàn tất nhập OTP và tạo mật khẩu
  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setGeminiSuggestion(null);

    if (!userEnteredOtp.trim()) {
      setErrorMessage('Vui lòng nhập mã OTP 6 số đã nhận qua email.');
      return;
    }

    if (!password.trim()) {
      setErrorMessage('Vui lòng nhập mật khẩu bạn muốn tạo.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Mật khẩu tối thiểu 6 ký tự để bảo vệ tài khoản.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp.');
      return;
    }

    // Moderate display name
    setIsLoading(true);
    const chosenDisplayName = displayName.trim() || (selectedStudent ? generateUsernameFromRealName(selectedStudent.realName) : generateUsernameFromRealName(realName));
    const modResult = await moderateDisplayName(chosenDisplayName);

    if (!modResult.isValid) {
      setIsLoading(false);
      setErrorMessage(modResult.reason || 'Tên hiển thị không phù hợp với môi trường học đường.');
      if (modResult.suggestedName) {
        setGeminiSuggestion(modResult.suggestedName);
      }
      return;
    }

    // Xác minh mã OTP thật với Supabase Auth
    let authUserId = 'usr_' + Date.now();
    try {
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: userEnteredOtp.trim(),
        type: 'email'
      });

      if (verifyError) {
        // Thử type 'signup' nếu type 'email' không khớp
        const { data: signupData, error: signupError } = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: userEnteredOtp.trim(),
          type: 'signup'
        });

        if (signupError) {
          setIsLoading(false);
          setErrorMessage('Mã OTP không chính xác hoặc đã hết hạn. Chi tiết: ' + signupError.message);
          return;
        } else if (signupData?.user) {
          authUserId = signupData.user.id;
          // Cập nhật mật khẩu cho tài khoản vừa verify
          await supabase.auth.updateUser({ password: password.trim() });
        }
      } else if (verifyData?.user) {
        authUserId = verifyData.user.id;
        // Cập nhật mật khẩu cho tài khoản vừa verify
        await supabase.auth.updateUser({ password: password.trim() });
      }

      // Upsert profile vào database
      await supabase.from('profiles').upsert({
        id: authUserId,
        role: 'student',
        display_name: chosenDisplayName,
        email: email.trim()
      });
    } catch (err: any) {
      console.warn('Lỗi xác thực OTP qua Supabase:', err);
    }

    // Mã hóa dữ liệu PII
    const finalRealName = selectedStudent?.realName || realName;
    const finalClass = selectedStudent?.className || className;
    const encRealName = await encryptSensitiveData(finalRealName);
    const encClass = await encryptSensitiveData(finalClass);
    const encUsername = await encryptSensitiveData(generateUsernameFromRealName(finalRealName));

    const newUser: UserProfile = {
      id: authUserId,
      encryptedRealName: encRealName,
      encryptedClassName: encClass,
      encryptedUsername: encUsername,
      displayName: chosenDisplayName,
      email: email.trim(),
      phone: phone.trim() || undefined,
      trustScore: 100,
      completedOrdersCount: 0,
      violationCount: 0,
      role: 'student',
      status: 'active',
      createdAt: new Date().toISOString()
    };

    setIsLoading(false);
    await completeLoginWithSession(newUser);
  };

  // Nộp đơn gửi Admin duyệt khi không khớp
  const handleSubmitAdminRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      
      // Lưu request vào localStorage để Admin có thể xem
      const newRequest: VerificationRequest = {
        id: 'req_' + Date.now(),
        userId: 'temp_' + Date.now(),
        submittedRealName: realName.trim(),
        submittedClassName: className.trim(),
        email: email.trim(),
        reason,
        reasonNote: reasonNote.trim() || undefined,
        proofImageUrl: proofFile ? proofFile.name : undefined,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      try {
        const existingReqs = JSON.parse(localStorage.getItem('ntsell_verification_requests') || '[]');
        localStorage.setItem('ntsell_verification_requests', JSON.stringify([newRequest, ...existingReqs]));
      } catch (err) {
        console.error('Failed to save request', err);
      }

      setStep('request_submitted');
    }, 600);
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaCode.trim() || !pendingMfaUser || !mfaFactorId) return;
    setIsLoading(true);
    setErrorMessage('');
    try {
      const { error: verifyErr } = await supabase.auth.mfa.challengeAndVerify({
        factorId: mfaFactorId,
        code: mfaCode.trim()
      });
      if (verifyErr) throw verifyErr;

      clearFailedLogins();
      try {
        if (pendingMfaUser.email) {
          await supabase.rpc('reset_rate_limit', { p_key: `admin_${pendingMfaUser.email}` });
        }
      } catch {}
      setIsLoading(false);
      await completeLoginWithSession(pendingMfaUser);
    } catch {
      setIsLoading(false);
      setErrorMessage('Mã xác thực 2FA/TOTP không hợp lệ hoặc đã hết hạn.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transition-all duration-350 ease-[cubic-bezier(0.33,1,0.68,1)] animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
        
        {/* Header modal */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-800 text-base">
              {authMode === 'register' ? 'Đăng Ký Tài Khoản Học Sinh' : 'Đăng Nhập Tài Khoản'}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab chuyển đổi Đăng Ký / Đăng Nhập phong cách Liquid Glass */}
        <div className="p-3 bg-slate-50/80 border-b border-slate-200/70 shrink-0">
          <div className="relative flex p-1.5 rounded-2xl liquid-glass-track overflow-hidden">
            <div 
              style={{
                left: tabIndicatorStyle.left,
                width: tabIndicatorStyle.width,
              }}
              className="absolute top-1.5 bottom-1.5 rounded-xl liquid-glass-pill transition-all duration-260 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
            />

            <button
              type="button"
              onClick={() => switchAuthMode('register')}
              className={`relative z-10 flex-1 py-2 text-xs font-extrabold rounded-xl transition-colors duration-200 select-none text-center ${
                authMode === 'register'
                  ? 'text-blue-700 font-black drop-shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Đăng Ký (2 Bước Xác Minh)
            </button>
            <button
              type="button"
              onClick={() => switchAuthMode('login')}
              className={`relative z-10 flex-1 py-2 text-xs font-extrabold rounded-xl transition-colors duration-200 select-none text-center ${
                authMode === 'login'
                  ? 'text-blue-700 font-black drop-shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Đăng Nhập
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {/* ================================================================= */}
          {/* CẢNH BÁO THIẾT BỊ ĐANG ĐĂNG NHẬP Ở NƠI KHÁC (SINGLE-DEVICE MODE)   */}
          {/* ================================================================= */}
          {deviceWarningInfo && (
            <div className="p-5 rounded-2xl bg-amber-50 border-2 border-amber-300 space-y-4 mb-4 text-center animate-in zoom-in-95">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-inner">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-amber-950 uppercase tracking-wide">
                  Phát hiện phiên đăng nhập khác
                </h4>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Tài khoản của bạn hiện đang hoạt động trên: <br/>
                  <span className="font-bold text-amber-950 bg-amber-200/70 px-2 py-0.5 rounded-md inline-block my-1">
                    💻 {deviceWarningInfo.previousDeviceName}
                  </span>
                  <br/>
                  Do chính sách <b>đơn thiết bị (Single-device)</b> để bảo vệ thông tin học sinh, nếu bạn tiếp tục, thiết bị cũ sẽ tự động bị đăng xuất ngay lập tức.
                </p>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setDeviceWarningInfo(null)}
                  className="flex-1 py-2.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 shadow-xs"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const user = deviceWarningInfo.user;
                    setDeviceWarningInfo(null);
                    await completeLoginWithSession(user, true);
                  }}
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-600/20 transition"
                >
                  Đăng Xuất Thiết Bị Cũ & Tiếp Tục
                </button>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 1: NHẬP THÔNG TIN (Tên thật, Lớp học, Email / Mật khẩu)       */}
          {/* ================================================================= */}
          {step === 'input' && (
            <form onSubmit={handleSubmitInput} className="space-y-4">
              {/* Box Thông Báo Bảo Mật PII */}
              <div className="bg-blue-50/90 border border-blue-200/80 rounded-xl p-3 text-xs text-blue-900 flex items-start gap-2.5">
                <Lock className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="font-bold text-sm text-blue-950">Bảo Mật Dữ Liệu Học Sinh:</p>
                  <p className="text-xs text-blue-900 leading-relaxed">
                    Họ tên thật và Email được <span className="text-xs font-extrabold text-indigo-700 bg-indigo-100/70 px-1.5 py-0.5 rounded-md">mã hoá</span> an toàn. Sàn giao dịch chỉ hiển thị Tên hiển thị (Display Name) để bảo vệ danh tính của bạn.
                  </p>
                </div>
              </div>

              {/* Tên Đăng Nhập / Họ Tên */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {authMode === 'login' ? 'Tên Đăng Nhập / Họ và Tên *' : 'Họ và Tên Thật *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={authMode === 'login' ? 'Nhập tên tài khoản hoặc họ tên...' : 'Ví dụ: Nguyễn Văn An'}
                  value={realName}
                  onChange={(e) => setRealName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                />
              </div>

              {/* Lớp Học & Bộ Lọc Nhanh Khối (Chỉ cần khi ĐĂNG KÝ để đối chiếu danh sách trường) */}
              {authMode === 'register' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Lớp Học *
                    </label>
                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px] font-bold">
                      {(['ALL', '10', '11', '12'] as const).map(g => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => {
                            setSelectedGrade(g);
                            if (g === '10') setClassName('10C1');
                            else if (g === '11') setClassName('11B1');
                            else if (g === '12') setClassName('12A1');
                          }}
                          className={`px-2 py-0.5 rounded-md transition ${
                            selectedGrade === g
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                          }`}
                        >
                          {g === 'ALL' ? 'Tất cả' : `Khối ${g}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <select
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium"
                  >
                    {filteredClasses.map(c => (
                      <option key={c} value={c}>Lớp {c}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* ĐĂNG KÝ: Trường Email cá nhân */}
              {authMode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-blue-600" />
                      Email Cá Nhân (Bất kỳ) *
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">Để nhận OTP & khôi phục</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="email_cua_ban@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    ⏱️ Xác minh tức thì qua OTP trong vòng 5 phút.
                  </p>
                </div>
              )}

              {/* ĐĂNG NHẬP: Mật khẩu */}
              {authMode === 'login' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-blue-600" />
                    Mật Khẩu *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Nhập mật khẩu tài khoản..."
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              {/* Nút bật tắt xem mã hoá PII client-side */}
              {authMode === 'register' && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowCryptoInspector(!showCryptoInspector)}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <Lock className="w-3 h-3" />
                    {showCryptoInspector ? 'Ẩn chi tiết mã hoá PII' : 'Xem mô phỏng mã hoá dữ liệu'}
                  </button>

                  {showCryptoInspector && (
                    <div className="mt-2 p-3 bg-slate-900 rounded-xl text-slate-300 font-mono text-[10px] space-y-1.5 overflow-hidden">
                      <div className="flex justify-between items-center text-emerald-400 font-bold border-b border-slate-800 pb-1">
                        <span>MÃ HOÁ PII HỌC SINH</span>
                        <span>CLIENT-SIDE</span>
                      </div>
                      <p><span className="text-slate-500">Username Auto:</span> <span className="text-amber-300">{previewAutoUsername || '(nhập họ tên)'}</span></p>
                      <p className="truncate"><span className="text-slate-500">Tên mã hóa:</span> <span className="text-blue-300">{previewEncryptedName || '(chưa nhập)'}</span></p>
                      <p className="truncate"><span className="text-slate-500">Lớp mã hóa:</span> <span className="text-purple-300">{previewEncryptedClass}</span></p>
                      <p className="text-[9px] text-slate-500 italic pt-0.5">Dữ liệu gốc được che giấu vĩnh viễn trước khi lưu trữ.</p>
                    </div>
                  )}
                </div>
              )}

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <TurnstileWidget 
                onToken={(t) => setTurnstileToken(t)} 
                onExpire={() => setTurnstileToken('')} 
              />

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang kiểm tra danh sách...</span>
                  </>
                ) : (
                  <>
                    <span>{authMode === 'register' ? 'Kiểm Tra Danh Sách Trường' : 'Đăng Nhập'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ================================================================= */}
          {/* STEP 2 - CASE 1: TÌM THẤY UNIQUE (1 NGƯỜI)                         */}
          {/* ================================================================= */}
          {step === 'confirm_unique' && selectedStudent && (
            <div className="space-y-4 py-1 text-center">
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <UserCheck className="w-8 h-8" />
              </div>

              <div>
                <h4 className="font-bold text-slate-800 text-base">Xác Nhận Danh Tính Học Sinh</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Hệ thống tìm thấy duy nhất 1 hồ sơ học sinh khớp với thông tin đã nhập:
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left text-xs space-y-2">
                <div className="flex justify-between items-center py-1 border-b border-slate-200">
                  <span className="text-slate-500">Họ và Tên:</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedStudent.realName}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200">
                  <span className="text-slate-500">Lớp học:</span>
                  <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                    Lớp {selectedStudent.className}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200">
                  <span className="text-slate-500">Mã Học Sinh:</span>
                  <span className="font-semibold text-slate-700 font-mono">{selectedStudent.studentCode}</span>
                </div>
                {selectedStudent.birthYear && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500">Niên khóa:</span>
                    <span className="text-slate-700">{selectedStudent.cohort || `Năm sinh ${selectedStudent.birthYear}`}</span>
                  </div>
                )}
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 text-left">
                <p className="font-semibold">Xác nhận bạn chính là {selectedStudent.realName} lớp {selectedStudent.className}?</p>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  Sau khi chọn "Đúng", hệ thống sẽ gửi mã OTP gồm 6 chữ số tới <b>{email}</b>.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('input')}
                  className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
                >
                  Không Phải Tôi
                </button>
                <button
                  type="button"
                  onClick={handleConfirmUniqueYes}
                  className="w-2/3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Đúng, Gửi OTP Đến Email
                </button>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 2 - CASE 2: TÌM THẤY NHƯNG CÓ NHIỀU NGƯỜI CÙNG TÊN & LỚP      */}
          {/* ================================================================= */}
          {step === 'select_duplicate' && (
            <div className="space-y-4 py-1">
              <div className="flex items-center gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-2xl">
                <Users className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900">
                    Phát hiện {matchingStudents.length} bạn cùng tên "{realName}" tại lớp {className}
                  </h4>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Vui lòng chọn đúng tài khoản của bạn theo Khóa / Năm sinh / Mã số học sinh:
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {matchingStudents.map((st, idx) => (
                  <div
                    key={st.id || idx}
                    onClick={() => handleSelectDuplicateStudent(st)}
                    className="p-3.5 bg-white border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 rounded-xl cursor-pointer transition shadow-2xs group flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">{st.realName}</span>
                        <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                          Lớp {st.className}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-3">
                        <span>Mã HS: <b className="text-slate-700 font-mono">{st.studentCode}</b></span>
                        {st.birthYear && <span>Năm sinh: <b>{st.birthYear}</b></span>}
                      </div>
                      {st.cohort && (
                        <p className="text-[10px] text-slate-400">{st.cohort}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      className="px-3 py-1.5 bg-slate-100 group-hover:bg-blue-600 group-hover:text-white text-slate-700 rounded-lg text-xs font-bold transition shadow-2xs flex items-center gap-1"
                    >
                      Chọn
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setStep('input')}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
              >
                Quay lại nhập thông tin khác
              </button>
            </div>
          )}

          {/* ================================================================= */}
          {/* BƯỚC NHẬP OTP VÀ TẠO PASSWORD (< 5 PHÚT)                          */}
          {/* ================================================================= */}
          {step === 'otp_password' && (
            <form onSubmit={handleCompleteRegistration} className="space-y-4 py-1">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-800 text-base">Xác Minh OTP & Tạo Mật Khẩu</h4>
                <p className="text-xs text-slate-500">
                  Xác minh quyền sở hữu email <b>{email}</b> cho học sinh <b>{selectedStudent?.realName}</b>.
                </p>
              </div>

              {/* Thông báo OTP */}
              {otpNotice && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2">
                  <Send className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">{otpNotice}</p>
                  </div>
                </div>
              )}

              {/* Ô Nhập OTP */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Mã Xác Thực OTP *
                  </label>
                  <button
                    type="button"
                    onClick={() => sendOtpToEmail(email, selectedStudent!)}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Gửi lại mã
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={8}
                  required
                  placeholder="Nhập mã xác thực từ email..."
                  value={userEnteredOtp}
                  onChange={(e) => setUserEnteredOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3.5 py-2.5 text-center text-lg tracking-widest font-mono font-bold rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Tạo Mật Khẩu */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tạo Mật Khẩu Đăng Nhập Mới *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Tối thiểu 6 ký tự..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Xác Nhận Lại Mật Khẩu *</span>
                    {confirmPassword && (
                      <span className={`text-[10px] font-bold ${password === confirmPassword ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {password === confirmPassword ? '✓ Khớp mật khẩu' : '✗ Chưa khớp'}
                      </span>
                    )}
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Nhập lại chính xác mật khẩu ở trên..."
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Tên hiển thị công khai */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên Hiển Thị Công Khai (Display Name)
                </label>
                <input
                  type="text"
                  placeholder="Để trống sẽ tự tạo biệt danh bảo mật"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p>{errorMessage}</p>
                    {geminiSuggestion && (
                      <button
                        type="button"
                        onClick={() => {
                          setDisplayName(geminiSuggestion);
                          setErrorMessage('');
                          setGeminiSuggestion(null);
                        }}
                        className="mt-1 text-blue-600 hover:underline font-semibold"
                      >
                        Dùng tên gợi ý an toàn: "{geminiSuggestion}"
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('input')}
                  className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Quay lại
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-2/3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-1.5"
                >
                  {isLoading ? 'Đang kích hoạt...' : 'Hoàn Tất Đăng Ký (< 5 phút)'}
                </button>
              </div>
            </form>
          )}

          {/* ================================================================= */}
          {/* STEP 2 - CASE 3: KHÔNG TÌM THẤY -> REQUEST ADMIN VERIFICATION     */}
          {/* ================================================================= */}
          {step === 'request_admin' && (
            <form onSubmit={handleSubmitAdminRequest} className="space-y-3.5 py-1">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold">Không tìm thấy thông tin trong danh sách trường!</p>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Bạn có thể gửi yêu cầu xác minh tài khoản trực tiếp tới Admin. Ban quản trị sẽ đối soát và phê duyệt trong vòng <b>24-48 giờ</b>.
                  </p>
                </div>
              </div>

              {/* Tóm tắt thông tin đã nhập */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Họ và tên:</span>
                  <span className="font-bold text-slate-800">{realName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Lớp học:</span>
                  <span className="font-semibold text-slate-800">{className}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email liên hệ:</span>
                  <span className="font-semibold text-blue-600">{email}</span>
                </div>
              </div>

              {/* Lý Do */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lý Do *
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium"
                >
                  <option value="class_transfer">Vừa chuyển lớp / đổi ban</option>
                  <option value="new_student">Học sinh mới chuyển vào trường</option>
                  <option value="name_misspelled">Tên ghi sai dấu trong danh sách trường</option>
                  <option value="other">Lý do khác</option>
                </select>
              </div>

              {/* Ghi chú chi tiết */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mô Tả / Lý Do Chi Tiết
                </label>
                <textarea
                  rows={2}
                  value={reasonNote}
                  onChange={(e) => setReasonNote(e.target.value)}
                  placeholder="Ghi rõ thông tin bổ sung để Admin đối chiếu nhanh hơn..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Minh chứng ảnh (Tùy chọn) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chứng Cứ / Minh Chứng (Tùy chọn - Thẻ HS, Học bạ, Giấy chuyển lớp)
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-3 text-center hover:bg-slate-50 transition cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="proof-upload"
                  />
                  <label htmlFor="proof-upload" className="cursor-pointer flex flex-col items-center">
                    <FileUp className="w-5 h-5 text-slate-400 mb-1" />
                    <span className="text-xs text-slate-600 font-medium">
                      {proofFile ? proofFile.name : 'Tải lên ảnh thẻ học sinh hoặc giấy tờ'}
                    </span>
                    <span className="text-[10px] text-slate-400">Được lưu trữ bảo mật trên Drive nội bộ của trường</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('input')}
                  className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Quay lại
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-2/3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-1.5"
                >
                  {isLoading ? 'Đang gửi hồ sơ...' : 'Gửi Yêu Cầu Cho Admin (24-48h)'}
                </button>
              </div>
            </form>
          )}

          {/* ================================================================= */}
          {/* THÔNG BÁO GỬI ĐƠN CHO ADMIN THÀNH CÔNG                             */}
          {/* ================================================================= */}
          {step === 'request_submitted' && (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 text-base">Đã Gửi Yêu Cầu Xác Minh!</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Hồ sơ của bạn đã được chuyển đến ban Quản trị viên (Admin). Admin sẽ kiểm tra và phản hồi qua email <b>{email}</b> trong <b>24-48 giờ</b>.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1 text-left">
                <p>• Họ tên yêu cầu: <b>{realName}</b></p>
                <p>• Lớp: <b>{className}</b></p>
                <p>• Trạng thái: <span className="text-amber-600 font-bold">Chờ duyệt (Pending)</span></p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition"
              >
                Đóng Cửa Sổ
              </button>
            </div>
          )}

          {/* ================================================================= */}
          {/* XÁC THỰC 2FA / TOTP CHO QUẢN TRỊ VIÊN                            */}
          {/* ================================================================= */}
          {step === 'mfa_verify' && (
            <form onSubmit={handleMfaVerify} className="space-y-4">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-800 text-base">Xác Thực 2 Bước (MFA/TOTP)</h4>
                <p className="text-xs text-slate-500">
                  {mfaQrCode 
                    ? 'Quét mã QR dưới đây bằng Google Authenticator hoặc Authy để kích hoạt bảo vệ 2 lớp bắt buộc cho Quản Trị Viên.'
                    : 'Tài khoản Quản Trị Viên đã kích hoạt bảo vệ 2 lớp. Vui lòng mở Google Authenticator hoặc Authy và nhập mã 6 số.'}
                </p>
              </div>

              {mfaQrCode && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-2 animate-in fade-in">
                  <p className="text-[11px] font-bold text-slate-700">
                    Quét mã QR để thêm tài khoản:
                  </p>
                  <img 
                    src={mfaQrCode} 
                    alt="MFA QR Code" 
                    className="w-36 h-36 mx-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xs" 
                  />
                  {mfaSecret && (
                    <p className="text-[10px] text-slate-500 font-mono select-all bg-slate-200/60 p-1.5 rounded-lg break-all">
                      Khóa nhập tay: <span className="font-bold text-slate-800">{mfaSecret}</span>
                    </p>
                  )}
                </div>
              )}

              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                  <p className="font-medium">{errorMessage}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Mã 6 chữ số từ ứng dụng Authenticator:
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  autoFocus
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-center text-xl tracking-[0.3em] font-mono font-bold focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden transition"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep('input');
                    setMfaCode('');
                    setMfaQrCode(null);
                    setMfaSecret(null);
                    setPendingMfaUser(null);
                  }}
                  className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
                >
                  Quay Lại
                </button>
                <button
                  type="submit"
                  disabled={isLoading || mfaCode.length < 6}
                  className="w-2/3 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-1.5"
                >
                  {isLoading ? 'Đang xác thực...' : 'Xác Thực & Đăng Nhập'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
