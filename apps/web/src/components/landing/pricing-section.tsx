import Link from 'next/link';
import { ArrowRight, Check, Minus, PackagePlus } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

export async function PricingSection() {
  const t = await getTranslations('landing');

  const plans = [
    {
      id: 'free',
      highlighted: false,
      badge: null,
      name: t('pricing.plans.free.name'),
      amount: t('pricing.plans.free.amount'),
      currency: t('pricing.plans.free.currency'),
      period: t('pricing.plans.free.period'),
      tagline: t('pricing.plans.free.tagline'),
      cta: t('pricing.plans.free.cta'),
      features: [
        { label: t('pricing.plans.free.features.applications'), included: true },
        { label: t('pricing.plans.free.features.validations'), included: true },
        { label: t('pricing.plans.free.features.adDownload'), included: true },
      ],
    },
    {
      id: 'pro',
      highlighted: true,
      badge: t('pricing.plans.pro.badge'),
      name: t('pricing.plans.pro.name'),
      amount: t('pricing.plans.pro.amount'),
      currency: t('pricing.plans.pro.currency'),
      period: t('pricing.plans.pro.period'),
      tagline: t('pricing.plans.pro.tagline'),
      cta: t('pricing.plans.pro.cta'),
      features: [
        { label: t('pricing.plans.pro.features.includedFree'), included: true },
        { label: t('pricing.plans.pro.features.applications'), included: true },
        { label: t('pricing.plans.pro.features.interviews'), included: true },
        { label: t('pricing.plans.pro.features.validations'), included: true },
        { label: t('pricing.plans.pro.features.adFree'), included: true },
      ],
    },
    {
      id: 'premium',
      highlighted: false,
      badge: null,
      name: t('pricing.plans.premium.name'),
      amount: t('pricing.plans.premium.amount'),
      currency: t('pricing.plans.premium.currency'),
      period: t('pricing.plans.premium.period'),
      tagline: t('pricing.plans.premium.tagline'),
      cta: t('pricing.plans.premium.cta'),
      features: [
        { label: t('pricing.plans.premium.features.includedPro'), included: true },
        { label: t('pricing.plans.premium.features.applications'), included: true },
        { label: t('pricing.plans.premium.features.interviews'), included: true },
        { label: t('pricing.plans.premium.features.validations'), included: true },
        { label: t('pricing.plans.premium.features.tracking'), included: true },
      ],
    },
  ] as const;

  const addonPackages = [
    {
      id: 'small',
      applications: t('pricing.addons.packages.small.applications'),
      price: t('pricing.addons.packages.small.price'),
    },
    {
      id: 'medium',
      applications: t('pricing.addons.packages.medium.applications'),
      price: t('pricing.addons.packages.medium.price'),
    },
    {
      id: 'large',
      applications: t('pricing.addons.packages.large.applications'),
      price: t('pricing.addons.packages.large.price'),
    },
  ] as const;

  return (
    <section className="section" id="preise" data-pose="idle" aria-labelledby="pricing-title">
      <div className="wrap">
        <div className="sec-row reveal">
          <div>
            <p className="eyebrow">{t('pricing.eyebrow')}</p>
            <h2 className="h2" id="pricing-title">
              {t('pricing.title')}
            </h2>
          </div>
          <p className="lead">{t('pricing.lead')}</p>
        </div>

        <div className="mt-10 !grid grid-cols-1 items-stretch gap-5 lg:grid-cols-3" data-pricing-grid>
          {plans.map((plan) => (
            <Card
              key={plan.id}
              data-plan={plan.id}
              className={cn(
                'reveal relative gap-0 overflow-visible rounded-[4px] border-[#D7DDE8] bg-white py-0 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-1 hover:border-[#1B2A49]',
                plan.highlighted &&
                  'border-[#1B2A49] bg-[#1B2A49] text-white shadow-[10px_10px_0_#EAF0F9] hover:border-[#1B2A49] hover:shadow-[12px_12px_0_#EAF0F9]',
              )}
            >
              {plan.badge ? (
                <Badge className="absolute -top-3 left-7 border-0 bg-[#40639C] px-3 py-1 font-mono text-[11px] uppercase text-white">
                  {plan.badge}
                </Badge>
              ) : null}

              <CardHeader className="block space-y-0 px-7 pt-8 pb-0">
                <h3 className="font-heading text-lg font-bold">
                  {plan.name}
                </h3>
                <div className="mt-4 flex min-h-12 items-baseline gap-1 font-mono">
                  <span className="text-2xl font-semibold">{plan.currency}</span>
                  <span className="text-4xl font-semibold">{plan.amount}</span>
                  <span
                    className={cn(
                      'text-sm text-[#6B7280]',
                      plan.highlighted && 'text-white/60',
                    )}
                  >
                    {plan.period}
                  </span>
                </div>
                <CardDescription
                  className={cn(
                    'mt-2 font-mono text-[11px] uppercase text-[#6B7280]',
                    plan.highlighted && 'text-white/60',
                  )}
                >
                  {plan.tagline}
                </CardDescription>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col px-7 pt-6 pb-7">
                <ul
                  className={cn(
                    'mb-7 !grid flex-1 content-start gap-3 border-t border-[#E0E0E0] pt-5',
                    plan.highlighted && 'border-white/20',
                  )}
                >
                  {plan.features.map((feature) => (
                    <li
                      key={feature.label}
                      className={cn(
                        'flex items-start gap-3 text-sm leading-5 text-[#1B2A49]',
                        plan.highlighted && 'text-white',
                        !feature.included && 'text-[#8B3A3A]',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 !grid size-5 shrink-0 place-items-center bg-[#E8F6EC] text-[#16803A]',
                          plan.highlighted && 'bg-white/10 text-[#8DB0E8]',
                          !feature.included && 'bg-[#FDECEC] text-[#B42318]',
                        )}
                        aria-hidden="true"
                      >
                        {feature.included ? <Check className="size-3.5" /> : <Minus className="size-3.5" />}
                      </span>
                      <span>{feature.label}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  size="lg"
                  variant={plan.highlighted ? 'secondary' : 'outline'}
                  className={cn(
                    'h-11 w-full rounded-[4px] border-[#1B2A49] font-semibold',
                    plan.highlighted && 'border-white bg-white !text-[#1B2A49] hover:bg-[#EAF0F9]',
                  )}
                >
                  <Link href="/register">
                    {plan.cta}
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-16 border-t border-[#D7DDE8] pt-12" aria-labelledby="addons-title">
          <div className="reveal flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <p className="eyebrow">{t('pricing.addons.eyebrow')}</p>
                <Badge variant="outline" className="border-[#5581C7] bg-[#EEF3FB] text-[#1B2A49]">
                  {t('pricing.addons.badge')}
                </Badge>
              </div>
              <h3 className="font-heading text-2xl font-bold text-[#1B2A49] sm:text-3xl" id="addons-title">
                {t('pricing.addons.title')}
              </h3>
            </div>
            <p className="max-w-xl text-sm leading-6 text-[#5F6775] md:text-right">
              {t('pricing.addons.lead')}
            </p>
          </div>

          <div className="mt-8 !grid grid-cols-1 gap-4 md:grid-cols-3">
            {addonPackages.map((addonPackage) => (
              <Card
                key={addonPackage.id}
                className="reveal group gap-0 rounded-[4px] border-[#D7DDE8] bg-[#F8FAFD] py-0 transition-[border-color,transform] duration-200 hover:-translate-y-1 hover:border-[#5581C7]"
              >
                <CardContent className="flex h-full flex-col px-6 py-6">
                  <div className="mb-5 !grid size-10 place-items-center bg-[#E7EEF9] text-[#315F9F]" aria-hidden="true">
                    <PackagePlus className="size-5" />
                  </div>
                  <h4 className="font-heading text-lg font-bold text-[#1B2A49]">
                    {addonPackage.applications}
                  </h4>
                  <div className="mt-3 mb-6 flex items-baseline gap-2 font-mono">
                    <span className="text-2xl font-semibold text-[#1B2A49]">{addonPackage.price}</span>
                    <span className="text-xs text-[#6B7280]">{t('pricing.addons.oneTime')}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="reveal mt-5 text-center text-xs leading-5 text-[#6B7280]">
            {t('pricing.addons.note')}
          </p>
        </div>
      </div>
    </section>
  );
}