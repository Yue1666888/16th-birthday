import { Controller, useWatch } from 'react-hook-form'
import { Check, ArrowUpRight } from 'lucide-react'
import { errorMessage } from '@/lib/api-error'
import type { useReplyForm } from './use-reply-form'
export function ReplyForm({
  controller,
}: {
  controller: ReturnType<typeof useReplyForm>
}) {
  const { form, submit, error, result } = controller
  const attendance = useWatch({ control: form.control, name: 'attendance' }),
    gift = useWatch({ control: form.control, name: 'giftChoice' })
  const { errors, isSubmitting } = form.formState
  return (
    <section
      className="invitation-form-section"
      id="reply"
      aria-labelledby="reply-heading"
    >
      <div className="invitation-section-title">
        <div>
          <span>01 / YOUR REPLY</span>
          <h2 id="reply-heading">赴约 · 留下你的回音</h2>
        </div>
        <p>相聚，从一句“我会来”开始。</p>
      </div>
      <div className="invitation-form-panel">
        <span className="form-corner top-left" />
        <span className="form-corner bottom-right" />
        <form onSubmit={submit} noValidate aria-label="邀请回执">
          <fieldset disabled={isSubmitting}>
            <div className="invitation-field">
              <label htmlFor="reply-name">
                真实姓名<span>*</span>
              </label>
              <div>
                <input
                  id="reply-name"
                  autoComplete="name"
                  placeholder="如何称呼你"
                  {...form.register('name')}
                  aria-invalid={!!errors.name}
                />
                {errors.name && (
                  <p className="invitation-field-error">
                    {errors.name.message}
                  </p>
                )}
              </div>
            </div>
            <div className="invitation-field">
              <label htmlFor="reply-phone">
                联系电话<span>*</span>
              </label>
              <div>
                <input
                  id="reply-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="11位大陆手机号"
                  {...form.register('phone')}
                  aria-invalid={!!errors.phone}
                />
                {errors.phone && (
                  <p className="invitation-field-error">
                    {errors.phone.message}
                  </p>
                )}
              </div>
            </div>
            <div className="invitation-field">
              <label htmlFor="reply-email">
                邮箱<span>*</span>
              </label>
              <div>
                <input
                  id="reply-email"
                  type="email"
                  autoComplete="email"
                  placeholder="留下便于联系的邮箱"
                  {...form.register('email')}
                  aria-invalid={!!errors.email}
                />
                {errors.email && (
                  <p className="invitation-field-error">
                    {errors.email.message}
                  </p>
                )}
              </div>
            </div>
            <div className="invitation-field">
              <span className="invitation-field-label">
                是否到场<span>*</span>
              </span>
              <Controller
                control={form.control}
                name="attendance"
                render={({ field }) => (
                  <label className="invitation-attendance">
                    <input
                      id="reply-attendance"
                      aria-label="是否到场"
                      name={field.name}
                      ref={field.ref}
                      onBlur={field.onBlur}
                      type="checkbox"
                      checked={field.value === 'ATTENDING'}
                      onChange={(event) => {
                        field.onChange(
                          event.target.checked ? 'ATTENDING' : 'NOT_ATTENDING',
                        )
                        if (
                          !event.target.checked &&
                          form.getValues('giftChoice') === 'PICKUP'
                        )
                          form.setValue('giftChoice', 'NONE', {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                      }}
                    />
                    <span className="attendance-tick" aria-hidden="true">
                      {field.value === 'ATTENDING' && <Check size={15} />}
                    </span>
                  </label>
                )}
              />
            </div>
            <div className="invitation-field">
              <span className="invitation-field-label" id="gift-label">
                礼物领取<span>*</span>
              </span>
              <div>
                <div
                  className="invitation-radio-group"
                  role="radiogroup"
                  aria-labelledby="gift-label"
                >
                  {(attendance === 'ATTENDING'
                    ? [
                        ['PICKUP', '到场自取'],
                        ['MAIL', '需要邮寄'],
                        ['NONE', '不需要'],
                      ]
                    : [
                        ['MAIL', '需要邮寄'],
                        ['NONE', '不需要'],
                      ]
                  ).map(([value, label]) => (
                    <label key={value}>
                      <input
                        type="radio"
                        value={value}
                        {...form.register('giftChoice')}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
                {errors.giftChoice && (
                  <p className="invitation-field-error">
                    {errors.giftChoice.message}
                  </p>
                )}
              </div>
            </div>
            {gift === 'MAIL' && (
              <div className="invitation-field">
                <label htmlFor="reply-address">
                  邮寄地址<span>*</span>
                </label>
                <div>
                  <textarea
                    id="reply-address"
                    autoComplete="street-address"
                    rows={3}
                    placeholder="请填写完整收件地址"
                    {...form.register('mailingAddress')}
                    aria-invalid={!!errors.mailingAddress}
                  />
                  {errors.mailingAddress && (
                    <p className="invitation-field-error">
                      {errors.mailingAddress.message}
                    </p>
                  )}
                </div>
              </div>
            )}
          </fieldset>
          {!!error && (
            <p className="invitation-submit-error" role="alert">
              {errorMessage(error)}
            </p>
          )}
          {result && (
            <div className="invitation-result" role="status">
              <Check size={18} />
              <div>
                <strong>回执已收到</strong>
                <p>
                  {result.result === 'UPDATED'
                    ? '已更新你的回执，感谢回复。'
                    : '感谢你的回复，期待再相聚。'}
                </p>
              </div>
            </div>
          )}
          <div className="invitation-submit-row">
            <p>同一手机号可再次提交，更新回执。</p>
            <button
              className="invitation-submit"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? '正在确认…' : '确认回执'}
              <ArrowUpRight size={17} />
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
