import '../../app/globals.css';
import Header from '@/components/Header/Header';
import Sidebar from '../../components/Sidebar/Sidebar';
import { Toaster } from 'react-hot-toast';
import ReduxProvider from '@/lib/ReduxProvider';
import { Authentication } from '@/utils/handleAuth';
import InitNotification from '@/components/Notification/initNotification';
import OnboardingWrapper from '@/components/Initial/OnboardingWrapper';
import ErrorBoundary from '@/components/Shared/ErrorBoundary';
import { ModelOptions } from '@/components/Shared/ModelOptions';
import MainContentWrapper from '@/components/Sidebar/MainContentWrapper';

export const viewport = {
  width: 'device-width',
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: 'no',
};
export const metadata = {
    title: 'Weam',
    description: 'Weam',
};

type PageLayoutProps = {
    children: React.ReactNode;
};

export default async function PageLayout({ children }: PageLayoutProps) {
    await Authentication();
    return (
        <ReduxProvider>
            <html lang="en">
                <body
                    suppressHydrationWarning={true}
                >
                    <div className="flex flex-1 flex-col">
                        {/* Main wrapper start */}
                        <ErrorBoundary>
                            <MainContentWrapper>
                                <Sidebar />
                                {/* Main content Start */}
                                <main className="main-content flex flex-col flex-1 lg:overflow-hidden pb-6">
                                    <Toaster
                                        position="top-right"
                                        reverseOrder={false}
                                    />
                                    <InitNotification/>
                                    <ModelOptions />
                                    <Header />
                                    <OnboardingWrapper>
                                        {children}
                                    </OnboardingWrapper>
                                </main>
                                {/* Main content End */}
                            </MainContentWrapper>
                        </ErrorBoundary>
                        {/* Main wrapper End */}
                    </div>
                </body>
            </html>
        </ReduxProvider>
    );
}
