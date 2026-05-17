#!/usr/bin/env python3
"""
ASCII Video Player with TRUE COLOR (24-bit RGB).
Each character shows the actual color of the video pixel.
Works on Windows (Windows Terminal), macOS, Linux.
"""

import cv2
import sys
import time
import shutil
import os
import numpy as np

# ========== CONFIGURATION ==========
ASCII_CHARS = " .:;irsXA#&%@"        # 12 levels (dark to bright)
USE_COLOR = True                     # True = 24-bit RGB color, False = monochrome
HIDE_CURSOR = True                   # Hide cursor while playing
# ===================================

# Platform-specific keyboard input
if os.name == 'nt':
    import msvcrt
    def get_key():
        if msvcrt.kbhit():
            key = msvcrt.getch()
            if key == b'q':
                return 'q'
            if key == b' ':
                return ' '
        return None
else:
    import termios
    import tty
    import select
    def get_key():
        dr, _, _ = select.select([sys.stdin], [], [], 0)
        if dr:
            return sys.stdin.read(1)
        return None

def get_terminal_size():
    try:
        columns, rows = shutil.get_terminal_size()
        return columns, rows
    except:
        return 80, 24

def pixel_to_ascii(gray_value):
    """Map 0-255 grayscale to ASCII index."""
    idx = int(gray_value / (255 / (len(ASCII_CHARS) - 1)))
    idx = min(idx, len(ASCII_CHARS) - 1)
    return ASCII_CHARS[idx]

def frame_to_ascii_color(frame, term_width, term_height):
    """
    Convert frame to colored ASCII art.
    Uses RGB true color escape sequences.
    """
    h, w = frame.shape[:2]
    target_height = term_height - 1   # leave bottom line for status
    target_width = term_width

    # Aspect ratio adjustment (terminal chars are taller than wide)
    aspect = h / w
    char_aspect = 2.0
    desired_height = int(target_width * aspect / char_aspect)
    if desired_height > target_height:
        desired_height = target_height
        desired_width = int(desired_height * char_aspect / aspect)
    else:
        desired_width = target_width

    if desired_width < 1: desired_width = 1
    if desired_height < 1: desired_height = 1

    # Resize the color frame
    resized = cv2.resize(frame, (desired_width, desired_height), interpolation=cv2.INTER_LINEAR)

    lines = []
    for y in range(resized.shape[0]):
        line_chars = []
        for x in range(resized.shape[1]):
            b, g, r = resized[y, x]  # OpenCV uses BGR
            # Compute luminance for ASCII character selection
            gray = int(0.299 * r + 0.587 * g + 0.114 * b)
            ascii_char = pixel_to_ascii(gray)
            if USE_COLOR:
                # True color ANSI escape: \033[38;2;R;G;Bm
                line_chars.append(f"\033[38;2;{r};{g};{b}m{ascii_char}\033[0m")
            else:
                line_chars.append(ascii_char)
        lines.append(''.join(line_chars))
    return '\n'.join(lines)

def hide_cursor():
    if HIDE_CURSOR:
        sys.stdout.write('\033[?25l')
        sys.stdout.flush()

def show_cursor():
    if HIDE_CURSOR:
        sys.stdout.write('\033[?25h')
        sys.stdout.flush()

def clear_screen():
    sys.stdout.write('\033[2J\033[H')
    sys.stdout.flush()

def play_video_ascii(video_path):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Error: Cannot open video {video_path}")
        return False

    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps <= 0:
        fps = 24
    frame_delay = 1.0 / fps

    clear_screen()
    hide_cursor()

    paused = False
    last_frame_time = time.time()
    frame_count = 0

    print("Controls: [q] quit | [space] pause/resume | [c] toggle color")
    print("Loading first frame...")
    time.sleep(0.5)

    try:
        while True:
            key = get_key()
            if key == 'q':
                break
            elif key == ' ':
                paused = not paused
                if paused:
                    sys.stdout.write("\n[PAUSED] Press SPACE to resume.\n")
                    sys.stdout.flush()
                else:
                    clear_screen()
                    sys.stdout.write("\n[RESUMED]\n")
                    sys.stdout.flush()
                    last_frame_time = time.time()
            elif key == 'c':
                # Toggle color mode (global variable)
                global USE_COLOR
                USE_COLOR = not USE_COLOR
                clear_screen()
                sys.stdout.write(f"\n[COLOR {'ON' if USE_COLOR else 'OFF'}]\n")
                sys.stdout.flush()
                time.sleep(0.2)

            if not paused:
                ret, frame = cap.read()
                if not ret:
                    break

                start_render = time.time()
                term_width, term_height = get_terminal_size()
                ascii_art = frame_to_ascii_color(frame, term_width, term_height)
                sys.stdout.write('\033[H')  # cursor to top-left
                sys.stdout.write(ascii_art)
                render_time = time.time() - start_render
                current_fps = 1.0 / (time.time() - last_frame_time) if frame_count > 0 else 0
                sys.stdout.write(f"\n[FPS: {current_fps:.1f}] [q] quit [space] pause [c] toggle color")
                sys.stdout.flush()

                elapsed = time.time() - last_frame_time
                sleep_time = frame_delay - elapsed
                if sleep_time > 0:
                    time.sleep(sleep_time)
                last_frame_time = time.time()
                frame_count += 1
            else:
                time.sleep(0.05)

    except KeyboardInterrupt:
        pass
    finally:
        cap.release()
        show_cursor()
        clear_screen()
        print("ASCII Player finished.")
    return True

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python vdo.py <video_file>")
        sys.exit(1)
    play_video_ascii(sys.argv[1])