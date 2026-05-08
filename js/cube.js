(function () {
    'use strict';

    /* ---------- helpers ---------- */

    // Returns the j-th adjacent face of the i-th face.
    // This is the core geometry math from the original.
    function mx(i, j) {
        return ([2, 4, 3, 5][j % 4 | 0] + i % 2 * ((j | 0) % 4 * 2 + 3) + 2 * (i / 2 | 0)) % 6;
    }

    function getAxis(face) {
        return String.fromCharCode('X'.charCodeAt(0) + face / 2); // X, Y, or Z
    }

    /* ---------- DOM helpers ---------- */

    function el(tag, cls) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        return e;
    }

    /* ---------- RubiksCube ---------- */

    var FACE_NAMES = ['left', 'right', 'top', 'bottom', 'back', 'front'];
    var COLORS = ['blue', 'green', 'white', 'yellow', 'orange', 'red'];
    var PIECE_COUNT = 26;

    var scene = document.getElementById('cube-scene');
    var pivot = document.getElementById('cube-pivot');
    var root = document.getElementById('cube-root');
    var pieces = [];

    /* Build 26 piece DOM nodes */
    function buildPieces() {
        for (var i = 0; i < PIECE_COUNT; i++) {
            var p = el('div', 'piece');
            FACE_NAMES.forEach(function (face) {
                p.appendChild(el('div', 'element ' + face));
            });
            root.appendChild(p);
            pieces.push(p);
        }
    }

    /* Place pieces in 3D, assign IDs and stickers */
    function assembleCube() {
        function attachSticker(faceIndex) {
            id |= (1 << faceIndex);
            var faceEl = pieces[i].children[faceIndex];
            var sticker = el('div', 'sticker ' + COLORS[faceIndex]);
            faceEl.appendChild(sticker);
            return 'translate' + getAxis(faceIndex) + '(' + (faceIndex % 2 * 4 - 2) + 'em)';
        }

        for (var id, x, i = 0; i < PIECE_COUNT; i++) {
            id = 0;
            x = mx(i, i % 18);
            var t = 'rotateX(0deg)' + attachSticker(i % 6);
            if (i > 5) t += attachSticker(x);
            if (i > 17) t += attachSticker(mx(x, x + 2));
            pieces[i].style.transform = t;
            pieces[i].id = 'piece' + id;
        }
    }

    function getPieceBy(face, index, corner) {
        return document.getElementById('piece' +
            ((1 << face) + (1 << mx(face, index)) + (1 << mx(face, index + 1)) * corner));
    }

    /* Swap stickers to reflect a face rotation */
    function swapPieces(face, times) {
        for (var i = 0; i < 6 * times; i++) {
            var p1 = getPieceBy(face, i / 2, i % 2);
            var p2 = getPieceBy(face, i / 2 + 1, i % 2);
            for (var j = 0; j < 5; j++) {
                var s1 = p1.children[j < 4 ? mx(face, j) : face].firstChild;
                var s2 = p2.children[j < 4 ? mx(face, j + 1) : face].firstChild;
                var cn = s1 ? s1.className : '';
                if (cn) { s1.className = s2.className; s2.className = cn; }
            }
        }
    }

    /* Animate a face rotation (CSS transform over 300ms) */
    function animateRotation(face, cw, t0) {
        var k = 0.3 * (face % 2 * 2 - 1) * (2 * cw - 1);
        var group = [pieces[face]].concat(
            Array.from({ length: 8 }, function (_, idx) {
                return getPieceBy(face, (idx + 1) / 2, (idx + 1) % 2);
            })
        );
        (function tick() {
            var dt = Date.now() - t0;
            var angle = k * dt * (dt < 300 ? 1 : 0);
            var style = 'rotate' + getAxis(face) + '(' + angle + 'deg)';
            group.forEach(function (piece) {
                piece.style.transform = piece.style.transform.replace(/rotate.\(\S+\)/, style);
            });
            if (dt >= 300) { swapPieces(face, 3 - 2 * cw); return; }
            requestAnimationFrame(tick);
        })();
    }

    /* ---- Drag interaction ---- */

    // Stores the current pivot angles
    var rotX = -30;
    var rotY = -45;

    // Smooth inertia
    var velX = 0, velY = 0;
    var isDragging = false;
    var lastMX, lastMY;
    var INERTIA = 0.88;

    function setPivot(rx, ry) {
        rotX = rx; rotY = ry;
        pivot.style.transform = 'rotateX(' + rx + 'deg) rotateY(' + ry + 'deg)';
    }

    // Idle auto-rotation (gentle slow spin when not interacting)
    var idleRAF;
    var idleAngle = -45;
    var idlePaused = false;

    function idleRotate() {
        if (!isDragging && !idlePaused) {
            idleAngle -= 0.08;
            rotY = idleAngle;
            pivot.style.transform = 'rotateX(' + rotX + 'deg) rotateY(' + idleAngle + 'deg)';
        }
        idleRAF = requestAnimationFrame(idleRotate);
    }

    function startInertia() {
        if (Math.abs(velX) < 0.05 && Math.abs(velY) < 0.05) {
            idlePaused = false;
            return;
        }
        rotX += velX;
        rotY += velY;
        velX *= INERTIA;
        velY *= INERTIA;
        pivot.style.transform = 'rotateX(' + rotX + 'deg) rotateY(' + rotY + 'deg)';
        requestAnimationFrame(startInertia);
    }

    scene.addEventListener('mousedown', function (e) {
        isDragging = true;
        idlePaused = true;
        velX = 0; velY = 0;
        lastMX = e.clientX;
        lastMY = e.clientY;
        e.preventDefault();
    });

    window.addEventListener('mousemove', function (e) {
        if (!isDragging) return;
        var dx = e.clientX - lastMX;
        var dy = e.clientY - lastMY;
        velY = dx * 0.35;
        velX = -dy * 0.35;
        rotX += velX;
        rotY += velY;
        pivot.style.transform = 'rotateX(' + rotX + 'deg) rotateY(' + rotY + 'deg)';
        lastMX = e.clientX;
        lastMY = e.clientY;
    });

    window.addEventListener('mouseup', function () {
        if (!isDragging) return;
        isDragging = false;
        startInertia();
    });

    // Touch support
    scene.addEventListener('touchstart', function (e) {
        isDragging = true;
        idlePaused = true;
        velX = 0; velY = 0;
        lastMX = e.touches[0].clientX;
        lastMY = e.touches[0].clientY;
        e.preventDefault();
    }, { passive: false });

    window.addEventListener('touchmove', function (e) {
        if (!isDragging) return;
        var dx = e.touches[0].clientX - lastMX;
        var dy = e.touches[0].clientY - lastMY;
        velY = dx * 0.35;
        velX = -dy * 0.35;
        rotX += velX;
        rotY += velY;
        pivot.style.transform = 'rotateX(' + rotX + 'deg) rotateY(' + rotY + 'deg)';
        lastMX = e.touches[0].clientX;
        lastMY = e.touches[0].clientY;
    }, { passive: true });

    window.addEventListener('touchend', function () {
        if (!isDragging) return;
        isDragging = false;
        startInertia();
    });

    // Resume idle after 3s of no interaction
    scene.addEventListener('mousedown', function () {
        clearTimeout(scene._idleTimer);
        idlePaused = true;
    });
    window.addEventListener('mouseup', function () {
        scene._idleTimer = setTimeout(function () { idlePaused = false; }, 3000);
    });

    /* ---- Auto-scramble animation for visual interest ---- */
    function autoScramble() {
        var moves = [
            [0, 1], [1, 0], [2, 1], [3, 0], [4, 1], [5, 0],
            [0, 0], [2, 0], [1, 1], [4, 0], [3, 1], [5, 1]
        ];
        var idx = 0;
        function next() {
            if (idx >= moves.length) return;
            animateRotation(moves[idx][0], moves[idx][1], Date.now());
            idx++;
            setTimeout(next, 500);
        }
        setTimeout(next, 1200);
    }

    /* ---- init ---- */
    buildPieces();
    assembleCube();
    idleRotate();
    autoScramble();

})(); // end IIFE

/* ---- Dark mode toggle ---- */
(function () {
    var btn = document.getElementById('dark-toggle');
    var icon = document.getElementById('dark-icon');
    var html = document.documentElement;
    var dark = false;
    btn.addEventListener('click', function () {
        dark = !dark;
        html.setAttribute('data-theme', dark ? 'dark' : 'light');
        icon.className = dark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    });
})();