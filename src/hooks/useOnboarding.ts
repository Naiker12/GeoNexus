import { useEffect, useState } from "react"
import { isFirstLaunch, setOnboardingCompleted } from "@/api/filesystem-config"

export function useOnboarding() {
  const [loading, setLoading] = useState(true)
  const [showWizard, setShowWizard] = useState(false)

  useEffect(() => {
    isFirstLaunch().then((first) => {
      setShowWizard(first)
      setLoading(false)
    })
  }, [])

  const completeOnboarding = async () => {
    await setOnboardingCompleted()
    setShowWizard(false)
  }

  const dismissOnboarding = () => {
    setShowWizard(false)
  }

  return { loading, showWizard, completeOnboarding, dismissOnboarding }
}
