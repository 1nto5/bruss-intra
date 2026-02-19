'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

import { EVALUATION_PERIOD_LABELS } from '../../lib/constants';
import { localize } from '../../lib/types';
import type { EvaluationPeriodKind } from '../../lib/types';
import { insertEvaluationPeriod } from '../../actions/evaluation-periods';
import type { Dictionary } from '../../lib/dict';
import type { Locale } from '@/lib/config/i18n';

const PERIOD_TYPES: EvaluationPeriodKind[] = [
  'annual',
  'pre-hire',
  'probation-2m',
  'probation-5m',
  'contract-end',
];

interface AddPeriodDialogProps {
  dict: Dictionary;
  lang: Locale;
}

export function AddPeriodDialog({ dict, lang }: AddPeriodDialogProps) {
  const router = useRouter();
  const safeLang = (['pl', 'de', 'en'].includes(lang) ? lang : 'pl') as 'pl' | 'de' | 'en';
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<EvaluationPeriodKind>('annual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  async function handleSave() {
    setSaving(true);
    const res = await insertEvaluationPeriod(
      {
        name,
        type,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
      lang,
    );

    if ('error' in res) {
      if (res.error === 'validation' && res.issues) {
        toast.error(res.issues[0]?.message || dict.errors.contactIT);
      } else {
        toast.error(dict.errors.serverError);
      }
    } else {
      toast.success(dict.settings.periodCreated);
      setOpen(false);
      setName('');
      setStartDate('');
      setEndDate('');
      router.refresh();
    }
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>{dict.settings.addPeriod}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dict.settings.addPeriod}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{dict.settings.periodName}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>{dict.settings.periodType}</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as EvaluationPeriodKind)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_TYPES.map((pt) => (
                  <SelectItem key={pt} value={pt}>
                    {localize(EVALUATION_PERIOD_LABELS[pt], safeLang)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{dict.settings.startDate}</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <Label>{dict.settings.endDate}</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {dict.cancel}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? dict.loading : dict.save}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
