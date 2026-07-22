'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  FullPageLoader,
  CenteredLoader,
  InlineLoader,
} from '@/components/shared/loading';
import {
  ProfileSkeleton,
  ProfileCardSkeleton,
  JobPostingCardSkeleton,
  ApplicationCardSkeleton,
  FormFieldSkeleton,
  TableSkeleton,
  AvatarSkeleton,
  ButtonSkeleton,
  TextSkeleton,
  ImageSkeleton,
} from '@/components/shared/skeletons';
import { Download, Save, Send } from 'lucide-react';

export default function DemoLoadingPage() {
  const t = useTranslations('templates');
  const [showFullPageLoader, setShowFullPageLoader] = useState(false);
  const [buttonLoading, setButtonLoading] = useState({
    default: false,
    outline: false,
    destructive: false,
  });

  const simulateLoading = (key: keyof typeof buttonLoading) => {
    setButtonLoading((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setButtonLoading((prev) => ({ ...prev, [key]: false }));
    }, 2000);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">{t('demoLoading.title')}</h1>
        <p className="mt-1 text-muted-foreground">
          {t('demoLoading.subtitle')}
        </p>
      </div>

      {/* Spinner Variants */}
      <Card>
        <CardHeader>
          <CardTitle>{t('demoLoading.spinner.title')}</CardTitle>
          <CardDescription>{t('demoLoading.spinner.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            <div className="text-center">
              <Spinner size="sm" />
              <p className="mt-2 text-xs text-muted-foreground">{t('demoLoading.spinner.small')}</p>
            </div>
            <div className="text-center">
              <Spinner size="default" />
              <p className="mt-2 text-xs text-muted-foreground">{t('demoLoading.spinner.default')}</p>
            </div>
            <div className="text-center">
              <Spinner size="lg" />
              <p className="mt-2 text-xs text-muted-foreground">{t('demoLoading.spinner.large')}</p>
            </div>
            <div className="text-center">
              <Spinner size="xl" />
              <p className="mt-2 text-xs text-muted-foreground">{t('demoLoading.spinner.extraLarge')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading Wrappers */}
      <Card>
        <CardHeader>
          <CardTitle>{t('demoLoading.wrappers.title')}</CardTitle>
          <CardDescription>{t('demoLoading.wrappers.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-medium mb-3">{t('demoLoading.wrappers.centered')}</h4>
            <div className="border rounded-[4px]">
              <CenteredLoader message={t('demoLoading.wrappers.loadingData')} />
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-3">{t('demoLoading.wrappers.inline')}</h4>
            <div className="space-y-2">
              <InlineLoader message={t('demoLoading.wrappers.processing')} size="sm" />
              <InlineLoader message={t('demoLoading.wrappers.loadingContent')} />
              <InlineLoader message={t('demoLoading.wrappers.generatingReport')} size="lg" />
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-3">{t('demoLoading.wrappers.fullPage')}</h4>
            <Button onClick={() => setShowFullPageLoader(true)}>
              {t('demoLoading.wrappers.showFullPage')}
            </Button>
            {showFullPageLoader && (
              <FullPageLoader message={t('demoLoading.wrappers.loadingApplication')} />
            )}
            {showFullPageLoader && (
              <Button
                variant="outline"
                onClick={() => setShowFullPageLoader(false)}
                className="ml-2"
              >
                {t('demoLoading.wrappers.hide')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Button Loading States */}
      <Card>
        <CardHeader>
          <CardTitle>{t('demoLoading.buttons.title')}</CardTitle>
          <CardDescription>{t('demoLoading.buttons.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              loading={buttonLoading.default}
              onClick={() => simulateLoading('default')}
            >
              <Download className="mr-2 h-4 w-4" />
              {t('demoLoading.buttons.default')}
            </Button>
            <Button
              variant="outline"
              loading={buttonLoading.outline}
              onClick={() => simulateLoading('outline')}
            >
              <Save className="mr-2 h-4 w-4" />
              {t('demoLoading.buttons.outline')}
            </Button>
            <Button
              variant="destructive"
              loading={buttonLoading.destructive}
              onClick={() => simulateLoading('destructive')}
            >
              <Send className="mr-2 h-4 w-4" />
              {t('demoLoading.buttons.destructive')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Basic Skeleton */}
      <Card>
        <CardHeader>
          <CardTitle>{t('demoLoading.basicSkeleton.title')}</CardTitle>
          <CardDescription>{t('demoLoading.basicSkeleton.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </CardContent>
      </Card>

      {/* Specialized Skeletons */}
      <Card>
        <CardHeader>
          <CardTitle>{t('demoLoading.specialized.title')}</CardTitle>
          <CardDescription>{t('demoLoading.specialized.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-medium mb-3">{t('demoLoading.specialized.applicationCard')}</h4>
            <ApplicationCardSkeleton />
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-3">{t('demoLoading.specialized.jobPostingCard')}</h4>
            <JobPostingCardSkeleton />
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-3">{t('demoLoading.specialized.profileCard')}</h4>
            <ProfileCardSkeleton />
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-3">{t('demoLoading.specialized.formField')}</h4>
            <div className="space-y-4 max-w-md">
              <FormFieldSkeleton />
              <FormFieldSkeleton />
              <FormFieldSkeleton />
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-3">{t('demoLoading.specialized.text')}</h4>
            <TextSkeleton lines={4} />
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-3">{t('demoLoading.specialized.table')}</h4>
            <TableSkeleton rows={3} columns={4} />
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-3">{t('demoLoading.specialized.avatarButtons')}</h4>
            <div className="flex items-center gap-4">
              <AvatarSkeleton />
              <AvatarSkeleton className="h-12 w-12" />
              <AvatarSkeleton className="h-16 w-16" />
            </div>
            <div className="flex gap-2 mt-4">
              <ButtonSkeleton />
              <ButtonSkeleton className="w-32" />
              <ButtonSkeleton className="w-40" />
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-3">{t('demoLoading.specialized.image')}</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <ImageSkeleton aspectRatio="square" className="max-w-[200px]" />
                <p className="text-xs text-muted-foreground mt-2 text-center">{t('demoLoading.specialized.square')}</p>
              </div>
              <div>
                <ImageSkeleton aspectRatio="video" className="max-w-[200px]" />
                <p className="text-xs text-muted-foreground mt-2 text-center">{t('demoLoading.specialized.video')}</p>
              </div>
              <div>
                <ImageSkeleton aspectRatio="portrait" className="max-w-[200px]" />
                <p className="text-xs text-muted-foreground mt-2 text-center">{t('demoLoading.specialized.portrait')}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Complete Profile Skeleton */}
      <Card>
        <CardHeader>
          <CardTitle>{t('demoLoading.completeProfile.title')}</CardTitle>
          <CardDescription>{t('demoLoading.completeProfile.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-[4px] p-4 bg-muted/30">
            <ProfileSkeleton />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
