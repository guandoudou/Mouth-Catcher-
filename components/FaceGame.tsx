import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';
import { GameState, FoodItem, MouthBox, FOOD_TYPES } from '../types';
import { playSound } from '../utils/audio';

interface FaceGameProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  onScoreUpdate: (score: number) => void;
  onTimeUpdate: (time: number) => void;
  onGameEnd: () => void;
}

const GAME_DURATION = 30; // seconds

const FaceGame: React.FC<FaceGameProps> = ({ 
  gameState, 
  setGameState, 
  onScoreUpdate, 
  onTimeUpdate,
  onGameEnd 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [faceLandmarker, setFaceLandmarker] = useState<FaceLandmarker | null>(null);
  // Use a ref to track the landmarker instance for cleanup, independent of state updates
  const landmarkerInstanceRef = useRef<FaceLandmarker | null>(null);
  
  const requestRef = useRef<number>();
  const scoreRef = useRef(0);
  const lastSpawnTime = useRef(0);
  const foodsRef = useRef<FoodItem[]>([]);
  const startTimeRef = useRef<number>(0);
  const lastVideoTimeRef = useRef<number>(-1);
  
  // Ref for the big score animation
  const feedbackRef = useRef<{ text: string; startTime: number } | null>(null);

  // Initialize MediaPipe FaceLandmarker
  useEffect(() => {
    let isMounted = true;

    const initMediaPipe = async () => {
      // Avoid double initialization
      if (landmarkerInstanceRef.current) return;

      setGameState(GameState.LOADING_MODEL);
      try {
        // Use consistent version 0.10.18 for both JS and WASM
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm"
        );
        
        if (!isMounted) return;

        const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "GPU"
          },
          outputFaceBlendshapes: false,
          runningMode: "VIDEO",
          numFaces: 1
        });

        if (!isMounted) {
          landmarker.close();
          return;
        }

        landmarkerInstanceRef.current = landmarker;
        setFaceLandmarker(landmarker);
        setGameState(GameState.INTRO);
      } catch (error) {
        console.error("Error loading MediaPipe:", error);
        if (isMounted) {
            alert("Failed to load AI Vision models. Please refresh.");
        }
      }
    };

    initMediaPipe();
    
    return () => {
      isMounted = false;
      if (landmarkerInstanceRef.current) {
        landmarkerInstanceRef.current.close();
        landmarkerInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once

  const spawnFood = (canvasWidth: number) => {
    const type = FOOD_TYPES[Math.floor(Math.random() * FOOD_TYPES.length)];
    const x = Math.random() * (canvasWidth - 50) + 25; // Padding
    
    const newFood: FoodItem = {
      id: Math.random().toString(36).substr(2, 9),
      x,
      y: -50,
      emoji: type.emoji,
      points: type.points,
      speed: type.speed * (1 + scoreRef.current * 0.01), // Gets slightly faster as you score
      sound: type.sound
    };
    
    foodsRef.current.push(newFood);
  };

  const checkCollision = (mouth: MouthBox, food: FoodItem): boolean => {
    const foodSize = 40; // Approx pixel size of emoji
    
    // Simple AABB collision with a threshold
    const overlapX = Math.max(0, Math.min(mouth.x + mouth.width, food.x + foodSize) - Math.max(mouth.x, food.x));
    const overlapY = Math.max(0, Math.min(mouth.y + mouth.height, food.y + foodSize) - Math.max(mouth.y, food.y));
    const overlapArea = overlapX * overlapY;
    const foodArea = foodSize * foodSize;

    return (overlapArea / foodArea) > 0.30; // 30% overlap required
  };

  const animate = useCallback((time: number) => {
    if (!canvasRef.current || !videoRef.current || !faceLandmarker) {
        return;
    }
    
    const canvas = canvasRef.current;
    const video = videoRef.current;

    // Strict checks for video readiness to prevent MediaPipe crashes
    if (video.paused || video.ended || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
        requestRef.current = requestAnimationFrame(animate);
        return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ensure canvas matches video size
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
    }

    // Draw Video Feed
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Game Logic
    if (gameState === GameState.PLAYING) {
        const elapsedTime = (Date.now() - startTimeRef.current) / 1000;
        const remainingTime = Math.max(0, GAME_DURATION - elapsedTime);
        onTimeUpdate(remainingTime);

        if (remainingTime <= 0) {
            onGameEnd();
            return;
        }

        // Process Face Detection
        let startTimeMs = performance.now();
        // Check if video time has advanced to avoid duplicate processing
        if (video.currentTime !== lastVideoTimeRef.current) {
            lastVideoTimeRef.current = video.currentTime;
            
            try {
                const results = faceLandmarker.detectForVideo(video, startTimeMs);

                let mouthBox: MouthBox | null = null;

                if (results.faceLandmarks && results.faceLandmarks.length > 0) {
                    const landmarks = results.faceLandmarks[0];
                    
                    // Lip landmarks: Top: 13, Bottom: 14, Left: 61, Right: 291
                    const topLip = landmarks[13];
                    const bottomLip = landmarks[14];
                    const leftCorner = landmarks[61];
                    const rightCorner = landmarks[291];

                    // Convert to canvas coords (mirrored)
                    const getX = (val: number) => canvas.width - (val * canvas.width);
                    const getY = (val: number) => val * canvas.height;
                    
                    const mx_left = getX(leftCorner.x);
                    const mx_right = getX(rightCorner.x);
                    const my_top = getY(topLip.y);
                    const my_bottom = getY(bottomLip.y);

                    mouthBox = {
                        x: Math.min(mx_left, mx_right),
                        y: Math.min(my_top, my_bottom),
                        width: Math.abs(mx_left - mx_right),
                        height: Math.abs(my_top - my_bottom) * 1.5 
                    };

                    // Visualize Mouth Hitbox
                    ctx.strokeStyle = '#00FF00';
                    ctx.lineWidth = 3;
                    ctx.strokeRect(mouthBox.x, mouthBox.y, mouthBox.width, mouthBox.height);
                }

                // Check collisions and spawn food
                if (time - lastSpawnTime.current > 600) { 
                    spawnFood(canvas.width);
                    lastSpawnTime.current = time;
                }

                foodsRef.current.forEach((food, index) => {
                    food.y += food.speed;

                    // Draw Food
                    ctx.font = '40px Arial';
                    ctx.fillText(food.emoji, food.x, food.y);

                    // Collision Check
                    if (mouthBox && checkCollision(mouthBox, food)) {
                        scoreRef.current += food.points;
                        onScoreUpdate(scoreRef.current);
                        foodsRef.current.splice(index, 1);
                        
                        // Play Sound
                        playSound(food.sound);

                        // Set the big center feedback
                        feedbackRef.current = {
                          text: `+${food.points}`,
                          startTime: performance.now()
                        };

                        // Small feedback near mouth (optional, kept for immediate local context)
                        ctx.fillStyle = 'yellow';
                        ctx.fillText(`+${food.points}`, mouthBox.x, mouthBox.y - 20);
                    } else if (food.y > canvas.height) {
                        foodsRef.current.splice(index, 1);
                    }
                });

                // Draw Big Center Feedback
                if (feedbackRef.current) {
                  const { text, startTime } = feedbackRef.current;
                  const animationDuration = 800;
                  const age = performance.now() - startTime;
                  
                  if (age < animationDuration) {
                    const progress = age / animationDuration;
                    const scale = 1 + Math.sin(progress * Math.PI) * 0.5; // Pulse scale
                    const opacity = 1 - Math.pow(progress, 3); // Fade out

                    ctx.save();
                    ctx.translate(canvas.width / 2, canvas.height / 2);
                    ctx.scale(scale, scale);
                    
                    ctx.font = "900 120px 'Fredoka', sans-serif";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    
                    // Stroke (Outline)
                    ctx.lineWidth = 8;
                    ctx.lineJoin = 'round';
                    ctx.strokeStyle = `rgba(0, 0, 0, ${opacity})`;
                    ctx.strokeText(text, 0, 0);
                    
                    // Fill
                    ctx.fillStyle = `rgba(255, 215, 0, ${opacity})`; // Gold
                    ctx.fillText(text, 0, 0);
                    
                    ctx.restore();
                  } else {
                    feedbackRef.current = null;
                  }
                }

            } catch (error) {
                // Suppress visual errors for frame skips
                // console.warn("MediaPipe Processing Error:", error);
            }
        }
    }

    requestRef.current = requestAnimationFrame(animate);
  }, [faceLandmarker, gameState, onScoreUpdate, onTimeUpdate, onGameEnd]);

  // Start Camera
  useEffect(() => {
    const startCamera = async () => {
      // If camera is already running, just ensure animation loop is running
      if (videoRef.current && videoRef.current.srcObject) {
         if (videoRef.current.paused) {
             await videoRef.current.play().catch(e => console.error("Play error:", e));
         }
         if (requestRef.current) cancelAnimationFrame(requestRef.current);
         requestRef.current = requestAnimationFrame(animate);
         return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 1280, height: 720 } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.addEventListener('loadeddata', async () => {
             // Explicitly play to ensure readyState advances
             try {
                await videoRef.current?.play();
             } catch (e) {
                console.error("Auto-play failed", e);
             }
             if (requestRef.current) cancelAnimationFrame(requestRef.current);
             requestRef.current = requestAnimationFrame(animate);
          });
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        alert("Camera permission is required to play!");
      }
    };

    if (gameState === GameState.INTRO || gameState === GameState.PLAYING) {
        startCamera();
    }

    return () => {
        if (requestRef.current) {
            cancelAnimationFrame(requestRef.current);
        }
    };
  }, [animate, gameState]);

  // Reset Logic when game starts
  useEffect(() => {
      if (gameState === GameState.PLAYING) {
          scoreRef.current = 0;
          foodsRef.current = [];
          startTimeRef.current = Date.now();
          onScoreUpdate(0);
      }
  }, [gameState, onScoreUpdate]);

  return (
    <div className="relative w-full mx-auto aspect-video rounded-3xl overflow-hidden shadow-2xl bg-black border-4 border-blue-500/50">
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted
        className="absolute top-0 left-0 w-full h-full object-cover opacity-0" 
      />
      <canvas 
        ref={canvasRef} 
        className="absolute top-0 left-0 w-full h-full object-contain"
      />
      
      {gameState === GameState.LOADING_MODEL && (
         <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
             <div className="text-white text-2xl animate-pulse">Initializing AI Vision...</div>
         </div>
      )}
    </div>
  );
};

export default FaceGame;