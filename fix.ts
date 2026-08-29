        ...updates,
        updatedAt: new Date().toISOString()
      });
      return true;
    } catch (err) {
      console.error('[FirestoreService] updateLead error:', err);
      return false;
    }
  }
