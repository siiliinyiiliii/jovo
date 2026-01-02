/*工具函数*/

/*1. 生成唯一id*/
function generateUniqueId() {
            return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
/*2. 计算“多久以前”*/
function timeSince(date) {
            const seconds = Math.floor((new Date() - new Date(date)) / 1000);
            let interval = seconds / 31536000;
            if (interval > 1) return Math.floor(interval) + " 年前";
            interval = seconds / 2592000;
            if (interval > 1) return Math.floor(interval) + " 月前";
            interval = seconds / 86400;
            if (interval > 1) return Math.floor(interval) + " 天前";
            interval = seconds / 3600;
            if (interval > 1) return Math.floor(interval) + " 小时前";
            interval = seconds / 60;
            if (interval > 1) return Math.floor(interval) + " 分钟前";
            return "刚刚";
}
/*3. 压缩图片*/
function compressImage(source, options = {}) {
    const { quality = 0.8, maxWidth = 1024, maxHeight = 1024 } = options;

    return new Promise((resolve, reject) => {
        const img = new Image();

        // 增加跨域支持，防止某些情况下的画布污染
        img.crossOrigin = "Anonymous";

        img.onload = () => {
            let width = img.width;
            let height = img.height;

            // 计算缩放比例
            if (width > height) {
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width *= maxHeight / height;
                    height = maxHeight;
                }
            }

            try {
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // 转换为 Base64
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(dataUrl);
            } catch (e) {
                // 如果画布处理出错（比如内存不足），拒绝 Promise
                reject(e);
            }
        };

        img.onerror = (e) => reject(new Error("图片加载失败"));

        // 处理输入源
        if (source instanceof File) {
            img.src = URL.createObjectURL(source);
        } else {
            img.src = source;
        }
    });
}
/*4. 文件转编码*/
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}
/*5. 转Blob链接*/
function dataUrlToBlobUrl(dataUrl) {
    if (!dataUrl || !dataUrl.startsWith('data:')) {
        return dataUrl; // 如果不是dataURL，直接返回原值 (例如 http链接)
    }
    try {
        const arr = dataUrl.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        return URL.createObjectURL(blob);
    } catch (error) {
        console.error("DataURL to Blob URL conversion failed:", error);
        return dataUrl; // 转换失败则返回原始dataURL作为备用
    }
}
/*6. 十六进制转Blob*/
function hexToBlob(hex, contentType = '') {
    // 移除可能存在的前缀，并确保长度是偶数
    const hexString = hex.startsWith('0x') ? hex.slice(2) : hex;
    if (hexString.length % 2 !== 0) {
        console.error('无效的十六进制字符串，长度必须是偶数。');
        return null;
    }

    // 将十六进制字符串转换为字节数组
    const bytes = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < hexString.length; i += 2) {
        bytes[i / 2] = parseInt(hexString.substring(i, i + 2), 16);
    }

    const blob = new Blob([bytes], {type: contentType});
    return blob;
}
/*7. 显示黑色小提示*/
function showToast(message, duration = 3000) {
            let toast = document.getElementById('toast-notification');
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'toast-notification';
                toast.style.cssText = 'position:fixed; bottom:80px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.7); color:white; padding:10px 20px; border-radius:8px; z-index:10000; transition: opacity 0.5s, bottom 0.5s; opacity: 0;';
                document.body.appendChild(toast);
            }
            toast.textContent = message;
            setTimeout(() => {
                toast.style.opacity = '1';
                toast.style.bottom = '90px';
            }, 10);
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.bottom = '80px';
            }, duration);
}
/*8. 显示弹窗警告*/
function showAlert(message) {
            document.getElementById('alertMessage').innerHTML = message.replace(/\n/g, '<br>');
            document.getElementById('alertModal').classList.add('show');
}

/*9. 显示确认框*/
function showConfirm(message, onConfirm) {
            confirmCallback = onConfirm;
            document.getElementById('confirmMessage').textContent = message;
            document.getElementById('confirmModal').classList.add('show');
}