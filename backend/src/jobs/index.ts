import timeoutJob from './timeout.job';
import verificationJob from './verification.job';

export const startCronJobs = (): void => {
    console.log('Starting cron jobs...');

    timeoutJob.start();
    console.log('✅ Timeout job scheduled (hourly)');

    verificationJob.start();
    console.log('✅ Verification job scheduled (every 15 minutes)');
};

export const stopCronJobs = (): void => {
    timeoutJob.stop();
    verificationJob.stop();
    console.log('⏹️ All cron jobs stopped');
};
