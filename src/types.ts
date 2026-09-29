export type Status = 'saved' | 'applied' | 'interview' | 'offer' | 'rejected';
export interface Application { id:string; company:string; role:string; status:Status; appliedAt?:string; followUpAt?:string; url?:string; notes?:string; createdAt:string; }
