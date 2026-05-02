import React from 'react';
import { AbsoluteFill } from 'remotion';

export const SleepyTest = () => {
    return (
        <AbsoluteFill
            style={{
                backgroundColor: '#000000',
                justifyContent: 'center',
                alignItems: 'center',
            }}
        >
            <div
                style={{
                    color: '#ffffff',
                    fontSize: 60,
                    fontFamily: 'sans-serif',
                    fontWeight: '300',
                    textAlign: 'center',
                }}
            >
                DarkMine Video Engine - Teste de Renderização
            </div>
        </AbsoluteFill>
    );
};
