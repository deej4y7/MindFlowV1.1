import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { Task, WellnessCheckIn, RecommendationOutput } from "../types";

// Initialize Firebase Core
const app = initializeApp(firebaseConfig);

// CRITICAL: The app requires passing the specific firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ==========================================
// Authentication Operations
// ==========================================

export async function loginWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await syncUserRecord(result.user);
    return result.user;
  } catch (error) {
    console.error("Authentication error:", error);
    throw error;
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Sign-out error:", error);
    throw error;
  }
}

// ==========================================
// User Profile Operations
// ==========================================

export async function syncUserRecord(user: User, academicGoal?: string): Promise<void> {
  const path = `users/${user.uid}`;
  try {
    const userRef = doc(db, "users", user.uid);
    const existingSnap = await getDoc(userRef);

    if (!existingSnap.exists()) {
      await setDoc(userRef, {
        id: user.uid,
        userId: user.uid,
        email: user.email || "",
        displayName: user.displayName || "Student",
        photoURL: user.photoURL || "",
        academicGoal: academicGoal || "Maintain strong academic standing and balanced mental wellness",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else if (academicGoal !== undefined) {
      await updateDoc(userRef, {
        academicGoal,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchUserProfile(userId: string) {
  const path = `users/${userId}`;
  try {
    const userRef = doc(db, "users", userId);
    const snap = await getDoc(userRef);
    return snap.exists() ? snap.data() : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

// ==========================================
// Tasks Operations
// ==========================================

export function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, "_");
  return cleaned.length > 0 ? cleaned.slice(0, 128) : `id_${Date.now()}`;
}

export async function saveTask(userId: string, task: Task): Promise<void> {
  const cleanId = sanitizeId(task.id);
  const path = `tasks/${cleanId}`;
  try {
    const taskRef = doc(db, "tasks", cleanId);
    const snap = await getDoc(taskRef);

    const taskPayload = {
      id: cleanId,
      userId,
      title: task.title.slice(0, 200),
      course: task.course.slice(0, 50),
      estimatedMinutes: Math.max(1, Math.min(2000, Number(task.estimatedMinutes) || 30)),
      remainingMinutes: Math.max(0, Math.min(2000, Number(task.remainingMinutes) || 0)),
      priority: task.priority || "medium",
      deadlineText: (task.deadlineText || "Upcoming").slice(0, 100),
      dueDate: (task.plannedStartDate || task.deadlineAt || new Date().toISOString()).slice(0, 50),
      isFlexible: Boolean(task.isFlexible),
      status: task.status || "planned",
      cognitiveDemand: "deep_analytical",
    };

    if (snap.exists()) {
      await updateDoc(taskRef, {
        ...taskPayload,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(taskRef, {
        ...taskPayload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteTask(userId: string, taskId: string): Promise<void> {
  const cleanId = sanitizeId(taskId);
  const path = `tasks/${cleanId}`;
  try {
    const taskRef = doc(db, "tasks", cleanId);
    await deleteDoc(taskRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeTasks(
  userId: string,
  onUpdate: (tasks: Task[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const path = "tasks";
  const q = query(collection(db, "tasks"), where("userId", "==", userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: Task[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: data.id || d.id,
          title: data.title || "Untitled Task",
          course: data.course || "General",
          estimatedMinutes: data.estimatedMinutes || 60,
          remainingMinutes: data.remainingMinutes !== undefined ? data.remainingMinutes : 60,
          priority: data.priority || "medium",
          deadlineText: data.deadlineText || "Scheduled",
          deadlineAt: data.dueDate || new Date().toISOString(),
          isFlexible: Boolean(data.isFlexible),
          isFixedDeadline: !data.isFlexible,
          status: data.status || "planned",
          plannedStartDate: data.dueDate ? data.dueDate.slice(0, 10) : undefined,
        };
      });
      onUpdate(items);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

// ==========================================
// Wellness Check-In Operations
// ==========================================

export async function saveWellnessCheckIn(userId: string, checkIn: WellnessCheckIn): Promise<void> {
  const cleanId = sanitizeId(checkIn.id || `checkin_${userId}_today`);
  const path = `wellnessCheckIns/${cleanId}`;
  try {
    const ref = doc(db, "wellnessCheckIns", cleanId);
    const snap = await getDoc(ref);

    const payload = {
      id: cleanId,
      userId,
      date: (checkIn.dateLabel || new Date().toISOString().slice(0, 10)).slice(0, 50),
      wellnessComposite: Math.max(0, Math.min(10, Number(checkIn.wellnessComposite) || 5)),
      energy: Math.max(0, Math.min(10, Number(checkIn.energy) || 5)),
      motivation: Math.max(0, Math.min(10, Number(checkIn.motivation) || 5)),
      accomplishment: Math.max(0, Math.min(10, Number(checkIn.accomplishment) || 5)),
      sleepHours: 7.5,
      academicStress: Math.max(0, Math.min(10, 10 - Number(checkIn.wellnessComposite) || 5)),
      tier: checkIn.wellnessComposite >= 7.5 ? "sustainable" : checkIn.wellnessComposite >= 5.0 ? "strained" : "high_risk",
      sessionLengthMinutes: checkIn.wellnessComposite >= 7.5 ? 45 : checkIn.wellnessComposite >= 5.0 ? 25 : 15,
      recoveryBreakMinutes: checkIn.wellnessComposite >= 7.5 ? 5 : checkIn.wellnessComposite >= 5.0 ? 10 : 15,
      notes: (checkIn.note || "Capacity calibrated").slice(0, 500),
    };

    if (snap.exists()) {
      await updateDoc(ref, {
        ...payload,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeWellnessCheckIn(
  userId: string,
  onUpdate: (checkIn: WellnessCheckIn | null) => void,
  onError?: (err: unknown) => void
): () => void {
  const path = "wellnessCheckIns";
  const q = query(collection(db, "wellnessCheckIns"), where("userId", "==", userId));

  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        onUpdate(null);
        return;
      }
      // Get the most recent check-in
      const docs = snapshot.docs.map((d) => d.data());
      const latest = docs[docs.length - 1];
      onUpdate({
        id: latest.id,
        recordedAt: latest.date,
        dateLabel: latest.date,
        energy: latest.energy,
        motivation: latest.motivation,
        accomplishment: latest.accomplishment,
        wellnessComposite: latest.wellnessComposite,
        riskTrend: latest.academicStress,
        note: latest.notes,
      });
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

// ==========================================
// Adaptive Proposal Operations
// ==========================================

export async function saveProposal(userId: string, proposal: RecommendationOutput): Promise<void> {
  const cleanId = sanitizeId(proposal.id || `proposal_${userId}`);
  const path = `proposals/${cleanId}`;
  try {
    const ref = doc(db, "proposals", cleanId);
    const snap = await getDoc(ref);

    const payload = {
      id: cleanId,
      userId,
      sessionLengthMinutes: Math.max(10, Math.min(120, proposal.sessionLengthMinutes || 25)),
      originalLengthMinutes: Math.max(10, Math.min(2000, proposal.originalLengthMinutes || 60)),
      focusTaskId: (proposal.focusTaskId || "task_focus").slice(0, 128),
      focusTaskTitle: (proposal.focusTaskTitle || "Core Focus Task").slice(0, 200),
      focusTaskCourse: (proposal.focusTaskCourse || "General").slice(0, 50),
      suggestRecoveryBreak: Boolean(proposal.suggestRecoveryBreak),
      recoveryBreakMinutes: Math.max(2, Math.min(30, proposal.recoveryBreakMinutes || 10)),
      reasoning: (proposal.reasoning || "Calibrated to current cognitive capacity").slice(0, 1000),
      microAction: (proposal.microAction || "Start with 10 minutes").slice(0, 500),
      tier: proposal.tier || "sustainable",
      accepted: Boolean(proposal.accepted),
      dismissed: Boolean(proposal.dismissed),
    };

    if (snap.exists()) {
      await updateDoc(ref, {
        ...payload,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
