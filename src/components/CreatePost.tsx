import React, { useState, useRef } from 'react';
import { 
  PlusCircle, 
  Upload, 
  Video, 
  ShieldCheck, 
  AlertCircle, 
  Camera, 
  Check, 
  Sparkles, 
  Info,
  X,
  Image as ImageIcon,
  CheckCircle2,
  DollarSign,
  MapPin,
  HelpCircle,
  Lock,
  Clock,
  Send
} from 'lucide-react';
import { Product, ProductCondition } from '../types';
import { GENUINE_SERIAL_NUMBERS } from '../services/mockData';
import { encryptSensitiveData } from '../services/cryptoService';
import { moderatePostContent } from '../services/geminiModeration';

interface CreatePostProps {
  onSuccess: (newProduct: Product) => void;
  onCancel: () => void;
  sellerId?: string;
  sellerDisplayName: string;
  sellerTrustScore: number;
  initialProduct?: Product | null;
}

const POPULAR_MODELS = [
  'Casio FX-580VN X',
  'Casio FX-880BTG',
  'Casio FX-570VN Plus (2nd Edition)',
  'Casio FX-570ES Plus',
  'Flexio FX799VN',
  'Flexio FX680VN',
  'Khác (Nhập tùy chỉnh)'
];

export const CreatePost: React.FC<CreatePostProps> = ({
  onSuccess,
  onCancel,
  sellerId = 'user-current',
  sellerDisplayName,
  sellerTrustScore,
  initialProduct
}) => {
  const [productName, setProductName] = useState(initialProduct?.title || '');
  const [selectedModel, setSelectedModel] = useState(() => {
    if (initialProduct?.model && POPULAR_MODELS.includes(initialProduct.model)) {
      return initialProduct.model;
    }
    return initialProduct?.model ? 'Khác (Nhập tùy chỉnh)' : POPULAR_MODELS[0];
  });
  const [customModel, setCustomModel] = useState(() => {
    if (initialProduct?.model && !POPULAR_MODELS.includes(initialProduct.model)) {
      return initialProduct.model;
    }
    return '';
  });
  const [price, setPrice] = useState<string>(initialProduct ? String(initialProduct.price) : '400000');
  const [condition, setCondition] = useState<ProductCondition>(initialProduct?.condition || 'like_new');
  const [description, setDescription] = useState(initialProduct?.description || '');
  const [serialNumber, setSerialNumber] = useState(initialProduct?.serialNumber || '');
  
  // Quản lý danh sách ảnh thực tế tải lên
  const [images, setImages] = useState<string[]>(initialProduct?.imageUrls || []);
  const multiFileInputRef = useRef<HTMLInputElement | null>(null);

  const [hasDemoVideo, setHasDemoVideo] = useState(!!initialProduct?.demoVideoUrl);
  const [demoVideoName, setDemoVideoName] = useState<string>(initialProduct?.demoVideoUrl ? 'video_kiem_tra.mp4' : '');
  const [demoVideoUrl, setDemoVideoUrl] = useState<string>(initialProduct?.demoVideoUrl || '');
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedProduct, setSubmittedProduct] = useState<Product | null>(null);

  // Kiểm tra S/N tức thì đối soát
  const checkSNResult = serialNumber.trim() ? GENUINE_SERIAL_NUMBERS[serialNumber.trim().toUpperCase()] || GENUINE_SERIAL_NUMBERS[serialNumber.trim()] : null;

  // Xử lý nén ảnh trên canvas để đảm bảo ảnh nhẹ và không bao giờ bị tràn dung lượng localStorage
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 800;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.72));
          } else {
            resolve(event.target?.result as string);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  // Xử lý tải nhiều ảnh cùng lúc từ máy tính / điện thoại
  const handleMultipleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (fileList.length === 0) {
      setErrorMsg('Vui lòng chọn file hình ảnh hợp lệ (JPG, PNG, WebP).');
      return;
    }

    try {
      const compressedList = await Promise.all(fileList.map(f => compressImage(f)));
      setImages(prev => [...prev, ...compressedList]);
      setErrorMsg(null);
    } catch {
      setErrorMsg('Không thể xử lý một số hình ảnh. Vui lòng thử lại.');
    }

    // Reset input để có thể chọn tiếp file cùng tên nếu muốn
    e.target.value = '';
  };

  const handleRemoveImageIndex = (indexToRemove: number) => {
    setImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Xử lý tải video test phép tính
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setErrorMsg('Vui lòng chọn file video định dạng MP4/MOV/WebM.');
      return;
    }

    setDemoVideoName(file.name);
    setDemoVideoUrl(URL.createObjectURL(file));
    setHasDemoVideo(true);
    setErrorMsg(null);
  };

  // Xử lý gửi bài đăng
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Kiểm tra tên sản phẩm
    if (!productName.trim()) {
      setErrorMsg('Vui lòng nhập tên sản phẩm.');
      return;
    }

    // Kiểm tra giá bán
    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 10000) {
      setErrorMsg('Giá bán tối thiểu phải từ 10.000 VNĐ.');
      return;
    }

    // Bắt buộc nhập mã Serial Number
    if (!serialNumber.trim()) {
      setErrorMsg('Vui lòng nhập mã Serial Number (bắt buộc để xác thực máy chính hãng).');
      return;
    }

    // Kiểm tra tối thiểu 4 góc ảnh
    if (images.length < 4) {
      setErrorMsg(`Bạn cần tải lên tối thiểu 4 ảnh (Hiện có ${images.length}/4 ảnh) bao gồm mặt trước, mặt sau, cạnh bên và màn hình hiện Serial Number.`);
      return;
    }

    setIsSubmitting(true);

    const actualModel = selectedModel === 'Khác (Nhập tùy chỉnh)' 
      ? (customModel.trim() || 'Máy tính học sinh')
      : selectedModel;

    // 1. Kiểm tra thẩm định an toàn nội dung với Gemini Flash Lite AI
    try {
      const modRes = await moderatePostContent(
        productName.trim(),
        description.trim(),
        numPrice,
        actualModel
      );

      if (!modRes.isValid) {
        setIsSubmitting(false);
        setErrorMsg(`AI Phát hiện vi phạm: ${modRes.reason} ${modRes.suggestion ? `(${modRes.suggestion})` : ''}`);
        return;
      }
    } catch {
      // Bỏ qua lỗi mạng nếu AI kiểm tra không thể kết nối
    }

    const rawSN = serialNumber.trim().toUpperCase();
    const snStatus = checkSNResult ? checkSNResult.status : (rawSN ? 'unverified' : 'unverified');

    // Mặt nạ bảo mật S/N: Che giấu các ký tự ở giữa (ví dụ: 580V••••••2VN)
    const maskedSN = rawSN.length > 5 
      ? rawSN.slice(0, 3) + '••••••' + rawSN.slice(-2)
      : rawSN.slice(0, 1) + '••••';

    // Mã hóa S/N nguyên bản bằng thuật toán mật mã AES/SHA256 để chống cào quét
    encryptSensitiveData(rawSN).then(encSN => {
      const newProd: Product = {
        id: initialProduct ? initialProduct.id : ('prod-' + Date.now()),
        sellerId: initialProduct ? initialProduct.sellerId : sellerId,
        sellerDisplayName: initialProduct ? initialProduct.sellerDisplayName : sellerDisplayName,
        sellerTrustScore: initialProduct ? initialProduct.sellerTrustScore : sellerTrustScore,
        title: productName.trim(),
        model: actualModel,
        price: numPrice,
        condition,
        description: description.trim(),
        serialNumber: maskedSN, // Sử dụng serialNumber đã che giấu chống trộm
        maskedSerialNumber: maskedSN,
        encryptedSerialNumber: encSN, // Bản gốc mã hóa an toàn chỉ cấp cho giao dịch đối chiếu
        snStatus,
        imageUrls: images,
        demoVideoUrl: hasDemoVideo ? (demoVideoUrl || 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4') : undefined,
        tradeLocation: 'Thảo luận trong chat riêng',
        status: 'pending_admin',
        createdAt: initialProduct ? initialProduct.createdAt : new Date().toISOString()
      };

      setTimeout(() => {
        setIsSubmitting(false);
        setSubmittedProduct(newProd);
        onSuccess(newProd);
      }, 650);
    });
  };

  const uploadedCount = Object.keys(images).length;

  if (submittedProduct) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden p-8 text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-20 h-20 rounded-3xl bg-amber-50 border-2 border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
            <Clock className="w-10 h-10 animate-pulse" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              Đã gửi yêu cầu đăng bán
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Đang Chờ Quản Trị Viên (Admin) Phê Duyệt
            </h2>
            <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
              Yêu cầu bán máy tính của bạn đã được chuyển tới hàng đợi kiểm duyệt của Admin. Ban Quản Trị sẽ đối soát mã Serial Number và 4 góc ảnh thực tế trước khi máy hiển thị công khai trên chợ trường.
            </p>
          </div>

          {/* Tóm tắt sản phẩm vừa gửi */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left flex items-center gap-4">
            <img 
              src={submittedProduct.imageUrls[0]} 
              alt="" 
              className="w-20 h-20 rounded-xl object-cover border border-slate-200 shrink-0" 
            />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-slate-900 truncate">{submittedProduct.title}</h4>
              <p className="text-xs text-blue-600 font-extrabold mt-0.5">
                {submittedProduct.price.toLocaleString('vi-VN')} đ
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-slate-500">
                <span className="bg-white px-2 py-0.5 rounded-md border text-slate-700 font-medium">
                  {submittedProduct.model}
                </span>
                <span className="font-mono text-slate-600">S/N: {submittedProduct.serialNumber}</span>
                <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Trạng thái: Chờ duyệt
                </span>
              </div>
            </div>
          </div>

          {/* Các bước quy trình */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 text-xs">
              <span className="font-bold text-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Bước 1: Gửi bài
              </span>
              <p className="text-[11px] text-emerald-700 mt-1">Đã nộp đủ 4 góc ảnh & mã Serial Number bảo mật.</p>
            </div>

            <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 text-xs">
              <span className="font-bold text-amber-900 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" /> Bước 2: Admin duyệt
              </span>
              <p className="text-[11px] text-amber-800 mt-1">Đối soát máy chính hãng để bảo vệ học sinh mua.</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-400">
              <span className="font-bold text-slate-600 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-slate-400" /> Bước 3: Lên sàn
              </span>
              <p className="text-[11px] text-slate-500 mt-1">Xuất hiện công khai tại Chợ Máy Tính để bắt đầu nhận tin nhắn.</p>
            </div>
          </div>

          {/* Nút hành động */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onCancel}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/25 transition flex items-center justify-center gap-2"
            >
              Về Trang Chủ Chợ Máy
            </button>
            <button
              onClick={() => {
                setSubmittedProduct(null);
                setProductName('');
                setSerialNumber('');
                setImages([]);
                setDescription('');
              }}
              className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition"
            >
              Đăng Thêm Máy Tính Khác
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Header form */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shadow-inner">
                <PlusCircle className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                  Đăng Bán Máy Tính Học Đường
                </h1>
                <p className="text-xs text-blue-100 mt-1">
                  Đăng bán máy tính Casio / Flexio chính hãng - Nhanh chóng, an toàn và minh bạch
                </p>
              </div>
            </div>

            <button
              onClick={onCancel}
              type="button"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
              title="Đóng form"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Thông báo lỗi nếu có */}
        {errorMsg && (
          <div className="m-6 mb-0 p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-xs font-semibold animate-shake">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
          </div>
        )}

        {/* Thông báo lý do Admin yêu cầu bổ sung / sửa đổi */}
        {initialProduct?.adminNotes && (
          <div className="m-6 mb-0 p-4 rounded-2xl bg-amber-50 border border-amber-300 flex items-start gap-3 text-amber-900 text-xs font-semibold">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="font-bold text-amber-950">Yêu cầu chỉnh sửa / bổ sung từ Admin:</p>
              <p className="font-normal leading-relaxed text-amber-800 bg-white/60 p-2.5 rounded-xl border border-amber-200">
                "{initialProduct.adminNotes}"
              </p>
              <p className="text-[11px] text-amber-700">Vui lòng cập nhật lại thông tin hoặc chụp bổ sung ảnh theo yêu cầu bên trên rồi bấm gửi duyệt lại.</p>
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {/* Nhóm 1: Tên sản phẩm & Model */}
          <div className="space-y-4">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              1. Thông Tin Máy Tính
            </h2>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Tên Sản Phẩm <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Ví dụ: Casio FX-580VN X màu Đen Carbon còn mới 99%"
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Dòng Máy (Model) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  {POPULAR_MODELS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Tình Trạng Máy <span className="text-rose-500">*</span>
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as ProductCondition)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="brand_new">Mới 100% (Chưa qua sử dụng)</option>
                  <option value="like_new">Như mới 99% (Dùng rất ít, giữ kỹ)</option>
                  <option value="used_good">Đã qua sử dụng (Tốt, phím nảy)</option>
                  <option value="needs_repair">Cũ / Cần thay vỏ hoặc sửa nhẹ</option>
                </select>
              </div>
            </div>

            {selectedModel === 'Khác (Nhập tùy chỉnh)' && (
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Nhập Model máy của bạn <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  placeholder="Ví dụ: Casio fx-991EX..."
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Giá Bán (VNĐ) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min={10000}
                    step={10000}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="400000"
                    className="w-full pl-4 pr-14 py-2.5 text-sm font-bold text-blue-600 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    VNĐ
                  </span>
                </div>
                {Number(price) > 0 && (
                  <p className="text-[11px] text-slate-500 mt-1 font-medium">
                    = {Number(price).toLocaleString('vi-VN')} đồng
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                  <span>Mã Serial Number (S/N) <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-blue-600 font-bold">Bắt buộc</span>
                </label>
                <input
                  type="text"
                  required
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  placeholder="000A005CAD52..."
                  className="w-full px-4 py-2.5 text-sm uppercase rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1 leading-tight flex items-center gap-1">
                  <Lock className="w-3 h-3 text-indigo-600 shrink-0" />
                  Hệ thống tự động che giấu ký tự bảo mật (Masking) trên sàn và mã hóa để chống cào quét trộm mã S/N của học sinh.
                </p>
              </div>
            </div>

            {/* Hướng dẫn chụp màn hình Serial Number */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-2.5 text-xs text-indigo-900">
              <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Cách bật màn hình hiện [Serial number] trên máy Casio FX-580VN X:</span>
                <p className="text-[11px] text-indigo-700 mt-0.5">
                  Nhấn tổ hợp phím <kbd className="px-1.5 py-0.5 bg-white rounded border border-indigo-200 font-mono font-bold text-slate-800">SHIFT</kbd> + <kbd className="px-1.5 py-0.5 bg-white rounded border border-indigo-200 font-mono font-bold text-slate-800">7</kbd> + <kbd className="px-1.5 py-0.5 bg-white rounded border border-indigo-200 font-mono font-bold text-slate-800">ON</kbd>, sau đó nhấn phím <kbd className="px-1.5 py-0.5 bg-white rounded border border-indigo-200 font-mono font-bold text-slate-800">9</kbd> (hoặc phím chức năng kiểm tra Version/Serial) để hiển thị dòng chữ <strong>[Serial number]</strong> và mã S/N điện tử.
                </p>
              </div>
            </div>

            {checkSNResult && (
              <div className={`p-3 rounded-2xl text-xs flex items-center gap-2.5 ${
                checkSNResult.status === 'genuine' 
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                <ShieldCheck className="w-5 h-5 shrink-0" />
                <div>
                  <p className="font-bold">{checkSNResult.status === 'genuine' ? 'Khớp mã máy chính hãng' : 'Cảnh báo mã máy'}</p>
                  <p className="text-[11px] opacity-90">{checkSNResult.note}</p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Mô Tả Tình Trạng & Quá Trình Sử Dụng <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả cụ thể: mua khi nào, máy dùng ôn thi gì, các phím bấm có nhạy không, ốc sau lưng nguyên bản chưa mở..."
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Nhóm 2: Tải lên hình ảnh sản phẩm (Gộp 1 ô duy nhất) */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  2. Chụp & Tải Lên Hình Ảnh Thực Tế <span className="text-rose-500">*</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tải lên hình ảnh máy tính của bạn (Tối thiểu 4 ảnh chụp theo các góc lưu ý bên dưới)
                </p>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                images.length >= 4 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {images.length}/4 ảnh tối thiểu
              </span>
            </div>

            {/* Hộp lưu ý các ảnh cần chụp */}
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 space-y-2">
              <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                Lưu ý các góc ảnh cần chụp để bài đăng được duyệt nhanh:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-amber-800">
                <div className="flex items-start gap-1.5">
                  <span className="font-bold text-amber-900">• Mặt trước:</span>
                  <span>Chụp toàn bộ bàn phím, rõ logo thương hiệu Casio/Flexio</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="font-bold text-amber-900">• Mặt sau:</span>
                  <span>Chụp lưng máy, tem nhãn và các vị trí ốc vít nguyên bản</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="font-bold text-amber-900">• Cạnh bên:</span>
                  <span>Chụp độ dày, góc cạnh hoặc nắp trượt bảo vệ</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="font-bold text-amber-900">• Màn hình Serial:</span>
                  <span>Bật tổ hợp phím kiểm tra để hiện [Serial number] trên màn hình</span>
                </div>
              </div>
            </div>

            {/* Ô tải ảnh duy nhất (Unified Upload Area) */}
            <input
              type="file"
              multiple
              accept="image/*"
              ref={multiFileInputRef}
              onChange={handleMultipleImageUpload}
              className="hidden"
            />

            <div 
              onClick={() => multiFileInputRef.current?.click()}
              className="group cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/70 hover:bg-blue-50/20 p-6 sm:p-8 text-center transition-all flex flex-col items-center justify-center space-y-3"
            >
              <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 text-slate-400 group-hover:text-blue-600 group-hover:border-blue-300 flex items-center justify-center shadow-xs transition transform group-hover:scale-110">
                <Camera className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition">
                  Bấm vào đây để chọn hoặc chụp ảnh từ máy
                </p>
                <p className="text-xs text-slate-400">
                  Hỗ trợ tải nhiều ảnh cùng lúc (JPG, PNG, WebP) • Tối thiểu 4 ảnh
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-sm shadow-blue-600/20 group-hover:bg-blue-700 transition">
                <Upload className="w-3.5 h-3.5" /> Chọn Thêm Ảnh
              </span>
            </div>

            {/* Danh sách ảnh đã tải lên (Preview Gallery) */}
            {images.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
                  <span>Các ảnh đã chọn ({images.length})</span>
                  <button
                    type="button"
                    onClick={() => setImages([])}
                    className="text-rose-600 hover:underline"
                  >
                    Xóa tất cả
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {images.map((imgSrc, idx) => (
                    <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 group bg-slate-100 shadow-2xs">
                      <img src={imgSrc} alt={`Ảnh ${idx + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveImageIndex(idx);
                          }}
                          className="w-7 h-7 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center transition shadow-md"
                          title="Xóa ảnh này"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <span className="absolute bottom-1.5 left-1.5 bg-black/60 backdrop-blur text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                        #{idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Nhóm 3: Video thực tế bấm máy */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              3. Video Bấm Thử Máy Thực Tế (Tùy Chọn)
            </h2>

            <input
              type="file"
              accept="video/*"
              ref={videoInputRef}
              onChange={handleVideoUpload}
              className="hidden"
            />

            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/70 to-indigo-50/70 border border-blue-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    Video kiểm tra phép tính (2+2=4, √16=4)
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {demoVideoName ? `Đã đính kèm: ${demoVideoName}` : 'Quay video 5-10s bấm máy giúp bán nhanh gấp 3 lần và được ưu tiên huy hiệu'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                {hasDemoVideo ? (
                  <button
                    type="button"
                    onClick={() => {
                      setHasDemoVideo(false);
                      setDemoVideoName('');
                      setDemoVideoUrl('');
                    }}
                    className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-semibold hover:bg-rose-100 transition"
                  >
                    Gỡ video
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" /> Tải video lên
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Footer nút hành động */}
          <div className="flex items-center gap-3 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={onCancel}
              className="w-1/3 py-3 rounded-xl border border-slate-300 text-slate-700 text-xs sm:text-sm font-bold hover:bg-slate-50 transition"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-2/3 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold transition shadow-lg shadow-blue-600/25 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang gửi yêu cầu...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Gửi Yêu Cầu Duyệt Bán Máy
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
