// SUPABASE CONFIGURATION
const SUPABASE_URL = "https://fptgficzjkfaeafsweeg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwdGdmaWN6amtmYWVhZnN3ZWVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUzNDM4NDMsImV4cCI6MjExMDkxOTg0M30.Yfv_W2Yzq7A54lMiBiUkBI4wooXQLQL_OKd950x4Wcs";

const supabaseClient = (window.supabase && SUPABASE_URL.startsWith("https://"))
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

// Current rating global state
let selectedRating = 5;

// Page Switch Logic (Toggles active HTML page view seamlessly)
function switchPage(pageId) {
    const files = {
        homepage: 'index.html',
        biodata: 'biodata.html',
        portfolio: 'portfolio.html',
        video: 'video.html',
        comments: 'comments.html'
    };
    window.location.href = files[pageId] || 'index.html';
}

// Update Navigation Menu Active State
const navBtns = document.querySelectorAll('.nav-btn');
navBtns.forEach(btn => {
    btn.className = "nav-btn px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 text-darkBrown hover:text-rosePink hover:bg-softPinkBg";
});

// Close Mobile Menu if open
function checkMobileMenu(pageId) {
    const activeDesktopBtn = document.getElementById('nav-' + pageId);
    if (activeDesktopBtn) {
        activeDesktopBtn.className = "nav-btn px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 text-rosePink bg-softPinkBg shadow-sm";
    }
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
        toggleMobileMenu();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Mobile Menu Drawer Toggle
function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    const icon = document.getElementById('menu-icon');
    if (!menu) return;
    menu.classList.toggle('hidden');
    if (icon) {
        if (menu.classList.contains('hidden')) {
            icon.className = "fa-solid fa-bars text-lg";
        } else {
            icon.className = "fa-solid fa-xmark text-lg";
        }
    }
}

// Rating Selector Helper
function setRating(rating) {
    selectedRating = rating;
    const stars = document.querySelectorAll('.star-btn i');
    const ratingText = document.getElementById('ratingText');
    const ratingInput = document.getElementById('visitorRatingInput');
    stars.forEach((star, idx) => {
        if (idx < rating) {
            star.className = "fa-solid fa-star text-amber-400";
        } else {
            star.className = "fa-regular fa-star text-amber-300";
        }
    });
    if (ratingText) {
        ratingText.textContent = rating + " Star" + (rating > 1 ? "s" : "");
    }
    if (ratingInput) {
        ratingInput.value = rating + " / 5 Stars";
    }
}

// Format Timestamp nicely
function formatCommentDate(isoString) {
    if (!isoString) return 'Just now';
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return 'Just now';
    return date.toLocaleDateString('en-MY', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

function renderCommentCard(commentObj) {
    let starsHTML = '';
    for (let i = 0; i < 5; i++) {
        if (i < commentObj.rating) {
            starsHTML += '<i class="fa-solid fa-star"></i>';
        } else {
            starsHTML += '<i class="fa-regular fa-star text-amber-300"></i>';
        }
    }

    const initials = commentObj.name
        .split(' ')
        .filter(Boolean)
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase() || 'VT';

    const timeDisplay = commentObj.timeLabel || formatCommentDate(commentObj.created_at);

    const commentCard = document.createElement('div');
    commentCard.className = 'p-5 rounded-3xl bg-white border-2 border-dustyPink/40 shadow-cute space-y-2 animate-bounce-short';
    commentCard.innerHTML = `
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-full bg-softPinkBg text-rosePink flex items-center justify-center font-bold text-xs border border-dustyPink/40">
                    ${initials}
                </div>
                <div>
                    <h4 class="font-heading font-bold text-sm text-darkBrown">${escapeHtml(commentObj.name)}</h4>
                    <span class="text-[10px] text-darkBrown/50">${escapeHtml(timeDisplay)}</span>
                </div>
            </div>
            <div class="text-amber-400 text-xs">
                ${starsHTML}
            </div>
        </div>
        <p class="text-xs text-darkBrown/80 leading-relaxed">
            "${escapeHtml(commentObj.message)}"
        </p>
    `;
    return commentCard;
}

// Load All Public Comments from Supabase
async function loadSavedComments() {
    const commentsList = document.getElementById('commentsList');
    if (!commentsList || !supabaseClient) return;

    const { data, error } = await supabaseClient
        .from('comments')
        .select('id, name, message, rating, created_at')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error loading comments:', error);
        return;
    }

    commentsList.innerHTML = '';
    (data || []).forEach(item => {
        commentsList.appendChild(renderCommentCard(item));
    });

    const countElem = document.getElementById('commentCount');
    if (countElem) {
        countElem.textContent = (data || []).length;
    }
}

// Form Submission Handler (Saves to Supabase + Sends Email via Web3Forms)
async function handleCommentSubmit(event) {
    event.preventDefault();
    const form = document.getElementById('commentForm');
    const name = document.getElementById('visitorName').value.trim();
    const message = document.getElementById('visitorMessage').value.trim();

    if (!name || !message) return;

    // 1. Save comment to Supabase cloud database
    let savedToCloud = false;
    if (supabaseClient) {
        const { error } = await supabaseClient
            .from('comments')
            .insert([{
                name: name,
                message: message,
                rating: selectedRating
            }]);
        savedToCloud = !error;
        if (error) console.error('Supabase insert error:', error);
    }

    // Render immediately on screen
    const commentCard = renderCommentCard({
        name,
        message,
        rating: selectedRating,
        timeLabel: 'Just now'
    });
    const commentsList = document.getElementById('commentsList');
    if (commentsList) {
        commentsList.prepend(commentCard);
    }

    const countElem = document.getElementById('commentCount');
    if (countElem) {
        countElem.textContent = (parseInt(countElem.textContent, 10) || 0) + 1;
    }

    // 2. Send email notification via Web3Forms
    if (form) {
        const formData = new FormData(form);
        try {
            await fetch("https://api.web3forms.com/submit", {
                method: "POST",
                body: formData
            });
        } catch (err) {
            console.error('Web3Forms error:', err);
        }
        form.reset();
        setRating(5);
    }

    if (savedToCloud) {
        showToast("Thank you " + name + "! Your comment is live for everyone.");
    } else {
        showToast("Comment submitted, but could not sync to cloud.");
    }
}

// Custom Toast Notification
function showToast(text) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-6 right-6 z-50 bg-darkBrown text-white px-5 py-3 rounded-2xl shadow-2xl font-bold text-xs flex items-center gap-2 border-2 border-rosePink transition-all duration-300 transform translate-y-10 opacity-0';
    toast.innerHTML = `<span></span> ${text}`;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.classList.remove('translate-y-10', 'opacity-0');
    }, 50);
    setTimeout(() => {
        toast.classList.add('translate-y-10', 'opacity-0');
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}

// Escape HTML for security
function escapeHtml(str) {
    return String(str).replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#039;");
}

// Portfolio Detail Modal Toggle
function openModal(title, desc) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalDescription').innerHTML = desc;
    const modal = document.getElementById('projectModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeModal() {
    const modal = document.getElementById('projectModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

// Real HTML5 Video Player Controls
function formatVideoTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function toggleShowcaseVideo() {
    const video = document.getElementById("showcaseVideo");
    if (!video) return;
    if (video.paused) {
        video.play();
    } else {
        video.pause();
    }
}

function seekShowcaseVideo(event) {
    const video = document.getElementById("showcaseVideo");
    if (!video || !video.duration) return;
    const bar = event.currentTarget;
    const rect = bar.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const ratio = Math.min(Math.max(clickX / rect.width, 0), 1);
    video.currentTime = ratio * video.duration;
}

function toggleMuteVideo() {
    const video = document.getElementById("showcaseVideo");
    const volumeIcon = document.getElementById("volumeIcon");
    if (!video) return;
    video.muted = !video.muted;
    if (volumeIcon) {
        volumeIcon.className = video.muted
            ? "fa-solid fa-volume-xmark"
            : "fa-solid fa-volume-high";
    }
}

function toggleVideoFullscreen() {
    const frame = document.getElementById("videoFrame");
    if (!frame) return;
    if (!document.fullscreenElement) {
        frame.requestFullscreen?.().catch(() => {});
    } else {
        document.exitFullscreen?.().catch(() => {});
    }
}

// Initialize saved comments and video listeners on load
window.addEventListener('DOMContentLoaded', function () {
    loadSavedComments();

    const video = document.getElementById("showcaseVideo");
    if (!video) return;

    const playIcon = document.getElementById("playIcon");
    const videoProgress = document.getElementById("videoProgress");
    const videoTime = document.getElementById("videoTime");
    const statusDot = document.getElementById("statusDot");

    video.addEventListener("loadedmetadata", () => {
        if (videoTime) {
            videoTime.textContent = `00:00 / ${formatVideoTime(video.duration)}`;
        }
    });

    video.addEventListener("timeupdate", () => {
        if (!video.duration) return;
        const pct = (video.currentTime / video.duration) * 100;
        if (videoProgress) videoProgress.style.width = `${pct}%`;
        if (videoTime) {
            videoTime.textContent = `${formatVideoTime(video.currentTime)} / ${formatVideoTime(video.duration)}`;
        }
    });

    video.addEventListener("play", () => {
        if (playIcon) playIcon.className = "fa-solid fa-pause";
        if (statusDot) statusDot.classList.add("animate-ping");
    });

    video.addEventListener("pause", () => {
        if (playIcon) playIcon.className = "fa-solid fa-play";
        if (statusDot) statusDot.classList.remove("animate-ping");
    });

    video.addEventListener("ended", () => {
        if (playIcon) playIcon.className = "fa-solid fa-rotate-right";
        if (statusDot) statusDot.classList.remove("animate-ping");
    });
});