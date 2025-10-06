import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose} from "@/components/ui/dialog"
import Link from 'next/link';
import QrCode from "../../../public/qr-code.png" 
import Image from 'next/image';
import SecureIcon from "@/icons/SecureIcon";

const TwoFactorAuthModal = ({open, closeModal}) => {

  return (
      <Dialog open={open} onOpenChange={closeModal}>
          <DialogContent className="md:max-w-[550px] max-w-[calc(100%-30px)]">
              <DialogHeader>
                  <DialogTitle className="rounded-t-10 text-font-18 font-bold text-b2 bg-b12 px-[30px] py-6 border-b borer-b11">
                      <SecureIcon
                          width={'21'}
                          height={'24'}
                          className={'me-3 inline-block align-middle fill-b1'}
                      />
                      Secure Your Account
                  </DialogTitle>
              </DialogHeader>
              <div className="dialog-body h-full py-[30px] ">
                  <div className="h-full px-[30px] overflow-y-auto max-h-[75dvh]">
                      <div className="max-w-[460px] mx-auto text-center">
                          <p className="leading-[1.8]">
                              Add an extra layer of security to your account.
                              Enter a code from an app on your phone during sign
                              in.
                          </p>
                          <p className="leading-[1.8] mt-1">
                              First, download a two-factor authentication app
                              onto your phone or tablet, such as{' '}
                              <Link
                                  href="https://authy.com/"
                                  className="text-b2 hover:underline"
                              >
                                  Authy
                              </Link>
                              or
                              <Link
                                  href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2&hl=en_IN&pli=1"
                                  className="text-b2 hover:underline"
                              >
                                  Authenticator.
                              </Link>
                          </p>
                      </div>
                      <div className="max-w-[400px] mx-auto text-center mt-5">
                          <h5 className="text-font-16 font-bold text-b5 mb-4">
                              Step 1: Scan the barcode
                          </h5>
                          <Image
                              src={QrCode}
                              width={156}
                              height={156}
                              className="object-contain mx-auto mb-4"
                              alt="QR Code"
                          />
                          
                          <h5 className="text-font-16 font-bold text-b5 mb-4">
                              Step 2: Enter the 6-digit code from your app
                          </h5>
                          <div className="relative mb-5 mt-7">
                              <input
                                  type="text"
                                  className="default-form-input text-center !text-font-24 leading-none placeholder:text-b7 tracking-[2px]"
                                  placeholder="XXXXXX"
                                  id="verify-code"
                              />
                          </div>
                          <div className="flex items-center justify-center space-x-5">
                              <DialogClose asChild>
                                  <button className="btn btn-outline-gray btn-lg">
                                      Cancel
                                  </button>
                              </DialogClose>
                              <button className="btn btn-black btn-lg flex-1">
                                  Set Up Two-Factor Now
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          </DialogContent>
      </Dialog>
  );
};

export default TwoFactorAuthModal;
