const cvBtn = document.getElementById('cv-btn');
let url = 'https://drive.google.com/file/d/1jaoN_zPVQaAH8xM46vceVAbZJQnBRpHs/view?usp=drive_link';

if (cvBtn) {
    cvBtn.addEventListener('click', () => {
        window.open(url, '_blank', 'noopener,noreferrer');
    });
}