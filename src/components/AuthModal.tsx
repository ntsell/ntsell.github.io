import React, { useState } from 'react';
import { 
  X, 
  Shield, 
  CheckCircle2, 
  AlertCircle, 
  FileUp, 
  Sparkles, 
  Lock, 
  UserCheck,
  Mail,
  KeyRound,
  ArrowRight,
  RefreshCw,
  Users,
  Check,
  Clock,
  Send
} from 'lucide-react';
import { StudentRosterItem, UserProfile, VerificationRequest } from '../types';
import { moderateDisplayName } from '../services/geminiModeration';
import { encryptSensitiveData, generateUsernameFromRealName } from '../services/cryptoService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  roster: StudentRosterItem[];
  onLoginSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  roster,
  onLoginSuccess
}) => {
  // Danh sách chuẩn các lớp học của trường (38 lớp: 10C1-10C13, 11B1-11B13, 12A1-12A12)
  const SCHOOL_CLASSES = [
    '10C1', '10C2', '10C3', '10C4', '10C5', '10C6', '10C7', '10C8', '10C9', '10C10', '10C11', '10C12', '10C13',
    '11B1', '11B2', '11B3', '11B4', '11B5', '11B6', '11B7', '11B8', '11B9', '11B10', '11B11', '11B12', '11B13',
    '12A1', '12A2', '12A3', '12A4', '12A5', '12A6', '12A7', '12A8', '12A9', '12A10', '12A11', '12A12'
  ];

  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  
  // Registration substeps:
  // 'input' -> Step 1: Nhập Họ tên thật, Lớp, Email
  // 'confirm_unique' -> Step 2 (Case 1): Tìm thấy duy nhất 1 người -> Xác nhận bạn là [Tên] lớp [Lớp]
  // 'select_duplicate' -> Step 2 (Case 2): Có nhiều người cùng tên & lớp -> Chọn danh sách
  // 'otp_password' -> Nhập OTP (đã gửi tới email) + Tạo mật khẩu
  // 'request_admin' -> Step 2 (Case 3): Không tìm thấy -> Request Admin Verification form
  // 'request_submitted' -> Thông báo gửi admin thành công
  const [step, setStep] = useState<
    'input' | 'confirm_unique' | 'select_duplicate' | 'otp_password' | 'request_admin' | 'request_submitted'
  >('input');
  
  // Khối lọc nhanh (Frontend state)
  const [selectedGrade, setSelectedGrade] = useState<'ALL' | '10' | '11' | '12'>('ALL');
  
  // Form fields
  const [realName, setRealName] = useState('');
  const [className, setClassName] = useState('10C1');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');

  // Login form field
  const [loginPassword, setLoginPassword] = useState('');

  // Match and OTP state
  const [matchingStudents, setMatchingStudents] = useState<StudentRosterItem[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentRosterItem | null>(null);
  const [generatedOtp, setGeneratedOtp] = useState('');
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
      encryptSensitiveData(realName).then(setPreviewEncryptedName);
      setPreviewAutoUsername(generateUsernameFromRealName(realName));
    } else {
      setPreviewEncryptedName('');
      setPreviewAutoUsername('');
    }
    if (className) {
      encryptSensitiveData(className).then(setPreviewEncryptedClass);
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

  // Helper gửi OTP (mô phỏng gửi về email của user)
  const sendOtpToEmail = (targetEmail: string, student: StudentRosterItem) => {
    const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(randomOtp);
    setUserEnteredOtp('');
    setOtpNotice(`Mã OTP đã được gửi tới email ${targetEmail}! (Mã bảo mật thử nghiệm: ${randomOtp})`);
    setSelectedStudent(student);
    setStep('otp_password');
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

      if (isAdmin1) {
        if (trimmedClass !== '11B10') {
          setErrorMessage('Sai lớp học dành cho Admin 1 (yêu cầu: 11B10)!');
          return;
        }
        if (loginPassword.trim() !== '786602') {
          setErrorMessage('Sai mật khẩu Admin 1!');
          return;
        }

        setIsLoading(true);
        setTimeout(async () => {
          setIsLoading(false);
          const encRealName = await encryptSensitiveData('Cán Bộ 11B10');
          const encClass = await encryptSensitiveData('11B10');
          const encUsername = await encryptSensitiveData('hocsinh_11b10');

          const adminUser: UserProfile = {
            id: 'admin_root',
            encryptedRealName: encRealName,
            encryptedClassName: encClass,
            encryptedUsername: encUsername,
            displayName: 'Quản Trị Viên (Admin 1)',
            phone: '0987654321',
            trustScore: 100,
            completedOrdersCount: 50,
            violationCount: 0,
            role: 'admin',
            status: 'active',
            createdAt: new Date().toISOString()
          };

          onLoginSuccess(adminUser);
          onClose();
        }, 400);
        return;
      }

      if (isAdmin2) {
        if (trimmedClass !== '12A1') {
          setErrorMessage('Sai lớp học dành cho Admin 2 (yêu cầu: 12A1)!');
          return;
        }
        if (loginPassword.trim() !== '786602') {
          setErrorMessage('Sai mật khẩu Admin 2!');
          return;
        }

        setIsLoading(true);
        setTimeout(async () => {
          setIsLoading(false);
          const encRealName = await encryptSensitiveData('Cán Bộ 12A1');
          const encClass = await encryptSensitiveData('12A1');
          const encUsername = await encryptSensitiveData('admin_12a1');

          const admin2User: UserProfile = {
            id: 'admin_secondary',
            encryptedRealName: encRealName,
            encryptedClassName: encClass,
            encryptedUsername: encUsername,
            displayName: 'Quản Trị Viên 2 (Admin 2)',
            phone: '0912345678',
            trustScore: 100,
            completedOrdersCount: 30,
            violationCount: 0,
            role: 'admin',
            status: 'active',
            createdAt: new Date().toISOString()
          };

          onLoginSuccess(admin2User);
          onClose();
        }, 400);
        return;
      }
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
        setIsLoading(false);

        // Tìm học sinh theo họ tên
        const studentInAnyClass = roster.find(
          s => s.realName.toLowerCase().trim() === trimmedName.toLowerCase()
        );

        if (!studentInAnyClass) {
          setErrorMessage('Không tìm thấy tài khoản học sinh tương ứng với tên này!');
          return;
        }

        if (studentInAnyClass.className.toUpperCase().trim() !== trimmedClass) {
          setErrorMessage(`Sai thông tin lớp học! Học sinh ${studentInAnyClass.realName} thuộc lớp ${studentInAnyClass.className}.`);
          return;
        }

        // Tạo profile đăng nhập
        const encRealName = await encryptSensitiveData(studentInAnyClass.realName);
        const encClass = await encryptSensitiveData(studentInAnyClass.className);
        const encUsername = await encryptSensitiveData(generateUsernameFromRealName(studentInAnyClass.realName));

        const loggedInUser: UserProfile = {
          id: 'usr_' + studentInAnyClass.id,
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

        onLoginSuccess(loggedInUser);
        onClose();
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

    if (userEnteredOtp.trim() !== generatedOtp.trim()) {
      setErrorMessage('Mã OTP không chính xác. Vui lòng kiểm tra lại!');
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

    // Mã hóa dữ liệu PII
    const finalRealName = selectedStudent?.realName || realName;
    const finalClass = selectedStudent?.className || className;

    const encRealName = await encryptSensitiveData(finalRealName);
    const encClass = await encryptSensitiveData(finalClass);
    const encUsername = await encryptSensitiveData(generateUsernameFromRealName(finalRealName));

    const newUser: UserProfile = {
      id: 'usr_' + Date.now(),
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
    onLoginSuccess(newUser);
    onClose();
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

              {/* Tên Thật */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và Tên Thật *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Văn An"
                  value={realName}
                  onChange={(e) => setRealName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                />
              </div>

              {/* Lớp Học & Bộ Lọc Nhanh Khối */}
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
                    Mã OTP (6 chữ số) *
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
                  maxLength={6}
                  required
                  placeholder="Nhập mã 6 số ví dụ: 123456"
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
        </div>
      </div>
    </div>
  );
};
