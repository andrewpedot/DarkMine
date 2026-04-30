'use server';

import { updateProject } from './db';

export async function saveTitleToProject(projectId: string, titleFinal: string) {
    return updateProject(projectId, { title_final: titleFinal, status: 'script' });
}