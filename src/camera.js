function cameraName(label) {
    let clean = label.replace(/\s*\([0-9a-f]+(:[0-9a-f]+)?\)\s*$/, '');
    return clean || label || null;
}

function isMobile() {
    var userAgent = navigator.userAgent || navigator.vendor || window.opera;

    // Windows Phone must come first because its UA also contains "Android"
    if (/windows phone/i.test(userAgent)) {
        return true;
    }

    if (/android/i.test(userAgent)) {
        return true;
    }

    // iOS detection from: http://stackoverflow.com/a/9039885/177710
    if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
        return true;
    }

    return false;
}


class MediaError extends Error {
    constructor(type) {
        super(`Cannot access video stream (${type}).`);
        this.type = type;
    }
}

class Camera {
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this._stream = null;
        this.isMobile = false;
    }

    async start() {
        let constraints = {
            audio: false,
            video: {
                mandatory: {
                    sourceId: this.id,
                    minWidth: 600,
                    maxWidth: 800,
                    minAspectRatio: 1.6
                },
                optional: []
            }
        };

        // let iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if(isMobile()) {
            this.isMobile = true;
            constraints.video.facingMode = 'environment';
        }

        this._stream = await Camera._wrapErrors(async () => {
            return await navigator.mediaDevices.getUserMedia(constraints);
        });

        return this._stream;
    }

    stop() {
        if (!this._stream) {
            return;
        }

        for (let stream of this._stream.getVideoTracks()) {
            stream.stop();
        }

        this._stream = null;
    }

    static async getCameras() {
        await this._ensureAccess();

        let devices = await navigator.mediaDevices.enumerateDevices();
        return devices
            .filter(d => d.kind === 'videoinput')
            .map(d => new Camera(d.deviceId, cameraName(d.label)));
    }

    static async _ensureAccess() {
        return await this._wrapErrors(async () => {
            let access = await navigator.mediaDevices.getUserMedia({video: true});
            for (let stream of access.getVideoTracks()) {
                stream.stop();
            }
        });
    }

    static async _wrapErrors(fn) {
        try {
            return await fn();
        } catch (e) {
            if (e.name) {
                throw new MediaError(e.name);
            } else {
                throw e;
            }
        }
    }
}

module.exports = Camera;
