import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './firebase';
import { 
  onSnapshotsInSync, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  Timestamp,
  setDoc
} from 'firebase/firestore';

export type SyncStatus = 'initializing' | 'online' | 'offline' | 'syncing' | 'synced';

interface OfflineOperation {
  id: string; // Unique ID for this operation
  type: 'add' | 'update' | 'delete';
  collection: string;
  data?: any;
  targetId?: string; // ID of the document for update/delete
  timestamp: number;
}

class SyncManager {
  private static instance: SyncManager;
  private currentStatus: SyncStatus = 'initializing';
  private isOnline: boolean = false;
  private hasPendingWrites: boolean = false;
  private listeners: ((status: SyncStatus) => void)[] = [];
  private readonly QUEUE_KEY = '@offline_sync_queue';
  private isSyncingQueue: boolean = false;

  private constructor() {
    this.init();
  }

  public static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }

  private init() {
    // Monitor network status
    try {
      NetInfo.addEventListener(state => {
        const prevOnline = this.isOnline;
        this.isOnline = !!state.isConnected;
        console.log(`[SyncManager] Network Status Change: ${prevOnline ? 'Online' : 'Offline'} -> ${this.isOnline ? 'Online' : 'Offline'}`);
        
        if (this.isOnline && !prevOnline) {
          this.processQueue();
        }
        this.updateStatus();
      });
    } catch (e) {
      console.warn('[SyncManager] NetInfo failed:', e);
      this.isOnline = true;
    }

    // Monitor Firestore sync status (from memory cache)
    try {
      onSnapshotsInSync(db, () => {
        if (this.hasPendingWrites) {
          console.log('[SyncManager] Firestore: Memory writes synced.');
        }
        this.hasPendingWrites = false;
        this.updateStatus();
      });
    } catch (e) {
      console.error('[SyncManager] Firestore sync failed:', e);
    }

    // Initial queue processing
    this.processQueue();
  }

  public getStatus(): SyncStatus {
    return this.currentStatus;
  }

  public setPendingWrites(pending: boolean) {
    this.hasPendingWrites = pending;
    this.updateStatus();
  }

  public subscribe(callback: (status: SyncStatus) => void) {
    this.listeners.push(callback);
    callback(this.currentStatus);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private updateStatus() {
    let nextStatus: SyncStatus = 'initializing';

    if (!this.isOnline) {
      nextStatus = 'offline';
    } else if (this.isSyncingQueue || this.hasPendingWrites) {
      nextStatus = 'syncing';
    } else {
      nextStatus = 'synced';
    }

    if (this.currentStatus !== nextStatus) {
      console.log(`[SyncManager] Sync Status Change: ${this.currentStatus} -> ${nextStatus}`);
      this.currentStatus = nextStatus;
      this.notifyListeners();
    }
  }

  private notifyListeners() {
    this.listeners.forEach(l => l(this.currentStatus));
  }

  // --- AsyncStorage Queue Methods ---

  public async queueOperation(op: Omit<OfflineOperation, 'id' | 'timestamp'>) {
    try {
      const queue = await this.getQueue();
      const newOp: OfflineOperation = {
        ...op,
        id: Math.random().toString(36).substring(7),
        timestamp: Date.now()
      };
      queue.push(newOp);
      await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
      console.log(`[SyncManager] Operation queued: ${op.type} on ${op.collection}`);
      
      if (this.isOnline) {
        this.processQueue();
      }
    } catch (e) {
      console.error('[SyncManager] Failed to queue operation:', e);
    }
  }

  private async getQueue(): Promise<OfflineOperation[]> {
    try {
      const data = await AsyncStorage.getItem(this.QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  private async processQueue() {
    if (this.isSyncingQueue || !this.isOnline) return;
    
    // Set lock immediately before any async calls
    this.isSyncingQueue = true;
    
    try {
      const queue = await this.getQueue();
      if (queue.length === 0) {
        this.isSyncingQueue = false;
        return;
      }

      console.log(`[SyncManager] Processing ${queue.length} operations. Lock Acquired.`);
      this.updateStatus();

      const remainingQueue: OfflineOperation[] = [...queue];
      const itemsToSync = [...queue]; // Snapshot of what we are syncing

      for (const op of itemsToSync) {
        try {
          console.log(`[SyncManager] Syncing ${op.type} on ${op.collection} (ID: ${op.id})...`);
          
          if (op.type === 'add') {
            const docId = op.data.id || Math.random().toString(36).substring(7);
            const { id, ...dataToSave } = op.data;
            await setDoc(doc(db, op.collection, docId), {
              ...dataToSave,
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now()
            });
          } else if (op.type === 'update' && op.targetId) {
            await updateDoc(doc(db, op.collection, op.targetId), {
              ...op.data,
              updatedAt: Timestamp.now()
            });
          } else if (op.type === 'delete' && op.targetId) {
            await deleteDoc(doc(db, op.collection, op.targetId));
          }

          // Successfully synced, remove from memory queue
          const index = remainingQueue.findIndex(item => item.id === op.id);
          if (index > -1) remainingQueue.splice(index, 1);
          
        } catch (e) {
          console.error(`[SyncManager] Sync failed for ${op.id}:`, e);
          // Item remains in remainingQueue for next attempt
        }
      }

      await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(remainingQueue));
      console.log(`[SyncManager] Queue updated. Remaining: ${remainingQueue.length}`);
    } catch (e) {
      console.error('[SyncManager] Error in processQueue:', e);
    } finally {
      this.isSyncingQueue = false;
      this.updateStatus();
      console.log('[SyncManager] Lock Released.');
    }
  }
}

export const syncManager = SyncManager.getInstance();
