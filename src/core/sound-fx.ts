/**
 * AI Virtual Commanders Sound Engine (Permanently Muted per User Request)
 */

class SoundEngine {
  public getEnabled(): boolean {
    return false;
  }

  public setEnabled(_enabled: boolean) {
    // Sound permanently disabled
  }

  public toggle(): boolean {
    return false;
  }

  public play(_type: string) {
    // Sound disabled per user request
  }
}

export const sound = new SoundEngine();
