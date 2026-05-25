"use client";

import { useEffect, useRef } from "react";

interface FloatingLinesProps {
    linesGradient?: string[];
    animationSpeed?: number;
    interactive?: boolean;
    bendRadius?: number;
    bendStrength?: number;
    mouseDamping?: number;
    parallax?: boolean;
    parallaxStrength?: number;
    lineCount?: number;
    opacity?: number;
}

interface Line {
    x: number;
    y: number;
    length: number;
    angle: number;
    speed: number;
    width: number;
    colorIndex: number;
    offset: number;
}

export default function FloatingLines({
    linesGradient = ["#942929", "#FF7A00", "#ff0000"],
    animationSpeed = 0.8,
    interactive = true,
    bendRadius = 5,
    bendStrength = -0.5,
    mouseDamping = 0.01,
    parallax = true,
    parallaxStrength = 0.1,
    lineCount = 24,
    opacity = 1,
}: FloatingLinesProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
    const linesRef = useRef<Line[]>([]);
    const frameRef = useRef(0);
    const timeRef = useRef(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const resize = () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            initLines();
        };

        const initLines = () => {
            linesRef.current = Array.from({ length: lineCount }, (_, i) => ({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                length: 100 + Math.random() * 250,
                angle: Math.random() * Math.PI * 2,
                speed: (0.2 + Math.random() * 0.6) * animationSpeed,
                width: 1 + Math.random() * 2.5,
                colorIndex: i % linesGradient.length,
                offset: Math.random() * Math.PI * 2,
            }));
        };

        const onMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            mouseRef.current.targetX = e.clientX - rect.left;
            mouseRef.current.targetY = e.clientY - rect.top;
        };

        const onScroll = () => {
            if (parallax) {
                mouseRef.current.targetY += window.scrollY * parallaxStrength;
            }
        };

        resize();
        window.addEventListener("resize", resize);
        if (interactive) window.addEventListener("mousemove", onMouseMove);
        if (parallax) window.addEventListener("scroll", onScroll);

        const draw = (time: number) => {
            timeRef.current = time * 0.001;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Smooth mouse
            if (interactive) {
                mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * mouseDamping * 10;
                mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * mouseDamping * 10;
            }

            linesRef.current.forEach((line) => {
                // Drift
                line.x += Math.cos(line.angle) * line.speed * 0.5;
                line.y += Math.sin(line.angle) * line.speed * 0.5;
                line.angle += (Math.random() - 0.5) * 0.02;

                // Wrap around
                if (line.x < -line.length) line.x = canvas.width + line.length;
                if (line.x > canvas.width + line.length) line.x = -line.length;
                if (line.y < -line.length) line.y = canvas.height + line.length;
                if (line.y > canvas.height + line.length) line.y = -line.length;

                // Mouse bend influence
                let bx = 0, by = 0;
                if (interactive) {
                    const dx = mouseRef.current.x - line.x;
                    const dy = mouseRef.current.y - line.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const influence = Math.max(0, 1 - dist / (bendRadius * 80));
                    bx = dx * influence * bendStrength * 0.3;
                    by = dy * influence * bendStrength * 0.3;
                }

                // Sine wave along line
                const wave = Math.sin(timeRef.current * line.speed + line.offset) * 12;

                const cos = Math.cos(line.angle);
                const sin = Math.sin(line.angle);
                const perpX = -sin;
                const perpY = cos;

                const startX = line.x - cos * line.length * 0.5;
                const startY = line.y - sin * line.length * 0.5;
                const endX = line.x + cos * line.length * 0.5;
                const endY = line.y + sin * line.length * 0.5;

                const midX = (startX + endX) / 2 + perpX * wave + bx;
                const midY = (startY + endY) / 2 + perpY * wave + by;

                // Gradient per line
                const grad = ctx.createLinearGradient(startX, startY, endX, endY);
                const c1 = linesGradient[line.colorIndex % linesGradient.length];
                const c2 = linesGradient[(line.colorIndex + 1) % linesGradient.length];
                grad.addColorStop(0, c1 + "00");
                grad.addColorStop(0.5, c2);
                grad.addColorStop(1, c1 + "00");

                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.quadraticCurveTo(midX, midY, endX, endY);
                ctx.strokeStyle = grad;
                ctx.lineWidth = line.width;
                ctx.globalAlpha = opacity * (0.6 + 0.4 * Math.sin(timeRef.current * line.speed + line.offset));
                ctx.stroke();
                ctx.globalAlpha = 1;
            });

            frameRef.current = requestAnimationFrame(draw);
        };

        frameRef.current = requestAnimationFrame(draw);

        return () => {
            cancelAnimationFrame(frameRef.current);
            window.removeEventListener("resize", resize);
            if (interactive) window.removeEventListener("mousemove", onMouseMove);
            if (parallax) window.removeEventListener("scroll", onScroll);
        };
    }, [linesGradient, animationSpeed, interactive, bendRadius, bendStrength, mouseDamping, parallax, parallaxStrength, lineCount, opacity]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ display: "block" }}
        />
    );
}

