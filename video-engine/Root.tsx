import { Composition, registerRoot } from 'remotion';
import { SleepyTest } from './SleepyTest';
import React from 'react';

export const RemotionRoot: React.FC = () => {
    return (
        <>
            <Composition
                id="SleepyTest"
                component={SleepyTest}
                durationInFrames={450}
                fps={30}
                width={1920}
                height={1080}
            />
        </>
    );
};

registerRoot(RemotionRoot);
